'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';

// Configuration validation
if (process.env.NODE_ENV === 'production') {
  if (!process.env.NEXT_PUBLIC_SOCKET_URL) {
    console.error('Production Error: NEXT_PUBLIC_SOCKET_URL environment variable is not defined');
    // Don't throw here to avoid breaking the app, but log the issue
  }
}

// Define MediaAdapter type
interface MediaAdapterType {
  isSupported: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  checkSupport: () => boolean;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  checkMediaDevices: () => Promise<{hasVideo: boolean, hasAudio: boolean}>;
}

// More robust polyfill for MediaDevices API
const initMediaDevices = (): MediaAdapterType | null => {
  if (typeof window === 'undefined' || !navigator) return null;
  
  // Create an adapter object that we'll use for all media operations
  const mediaAdapter: MediaAdapterType = {
    isSupported: false,
    hasVideo: false,
    hasAudio: false,
    
    // Check if we have any media capability at all
    checkSupport: () => {
      const nav = navigator as any;
      
      // 1. Check if we have the standard mediaDevices
      if (nav.mediaDevices && nav.mediaDevices.getUserMedia) {
        mediaAdapter.isSupported = true;
        return true;
      }
      
      // 2. Check for legacy methods
      if (nav.getUserMedia || nav.webkitGetUserMedia || 
          nav.mozGetUserMedia || nav.msGetUserMedia) {
        mediaAdapter.isSupported = true;
        return true;
      }
      
      return false;
    },
    
    // Get user media with fallbacks
    getUserMedia: async (constraints: MediaStreamConstraints) => {
      const nav = navigator as any;
      
      // Special handling for Safari and iOS
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isSafari || isIOS) {
        console.log('Safari/iOS detected, using specific constraints');
        
        // Safari sometimes needs more basic constraints
        const safeConstraints = {
          audio: typeof constraints.audio === 'boolean' ? constraints.audio : {},
          video: typeof constraints.video === 'boolean' ? constraints.video : {
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        };
        
        try {
          if (nav.mediaDevices && nav.mediaDevices.getUserMedia) {
            return await nav.mediaDevices.getUserMedia(safeConstraints);
          }
        } catch (safariErr) {
          console.warn('Safari getUserMedia failed:', safariErr);
          
          // For Safari, try with just video if both failed
          if (safeConstraints.audio && safeConstraints.video) {
            try {
              console.log('Trying video-only for Safari');
              return await nav.mediaDevices.getUserMedia({
                video: true,
                audio: false
              });
            } catch (videoOnlyErr) {
              console.warn('Safari video-only request failed:', videoOnlyErr);
            }
          }
          
          // Let it continue to standard fallbacks
        }
      }
      
      // Standard method
      if (nav.mediaDevices && nav.mediaDevices.getUserMedia) {
        try {
          return await nav.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          console.warn('Standard getUserMedia failed:', err);
          
          // If we requested both audio and video, try just audio as fallback
          if (constraints.audio && constraints.video) {
            try {
              console.log('Falling back to audio-only');
              const audioStream = await nav.mediaDevices.getUserMedia({
                audio: true,
                video: false
              });
              console.log('Audio-only stream obtained as fallback');
              return audioStream;
            } catch (audioErr) {
              console.warn('Audio-only fallback also failed:', audioErr);
            }
          }
          
          // Continue to other fallbacks
          throw err;
        }
      }
      
      // Legacy methods with Promise wrapper
      const legacyGetUserMedia = nav.getUserMedia || 
                              nav.webkitGetUserMedia || 
                              nav.mozGetUserMedia || 
                              nav.msGetUserMedia;
                              
      if (legacyGetUserMedia) {
        try {
          return new Promise((resolve, reject) => {
            legacyGetUserMedia.call(nav, constraints, resolve, reject);
          });
        } catch (legacyErr) {
          console.warn('Legacy getUserMedia failed:', legacyErr);
        }
      }
      
      // Nothing available
      throw new Error('getUserMedia not supported in this browser');
    },
    
    // Check if camera is available without requesting permissions
    checkMediaDevices: async () => {
      try {
        const nav = navigator as any;
        
        // Try enumerateDevices - most reliable without triggering permissions
        if (nav.mediaDevices && nav.mediaDevices.enumerateDevices) {
          const devices = await nav.mediaDevices.enumerateDevices();
          mediaAdapter.hasVideo = devices.some((d: MediaDeviceInfo) => d.kind === 'videoinput');
          mediaAdapter.hasAudio = devices.some((d: MediaDeviceInfo) => d.kind === 'audioinput');
          return { hasVideo: mediaAdapter.hasVideo, hasAudio: mediaAdapter.hasAudio };
        }
        
        // Fallback - we don't know if we have media but will attempt
        return { hasVideo: true, hasAudio: true };
      } catch (err) {
        console.warn('Error checking media devices:', err);
        return { hasVideo: false, hasAudio: false };
      }
    }
  };
  
  // Initialize - sync operation on first load
  mediaAdapter.checkSupport();
  
  return mediaAdapter;
};

// Create a global media adapter
const MediaAdapter = initMediaDevices();

interface StreamInitializerProps {
  streamId: string;
  isHost: boolean;
  onStreamReady: (localStream: MediaStream) => void;
  onViewerCount: (count: number) => void;
}

export default function StreamInitializer({
  streamId,
  isHost,
  onStreamReady,
  onViewerCount,
}: StreamInitializerProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<{
    camera: boolean;
    microphone: boolean;
  }>({
    camera: false,
    microphone: false
  });
  
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<{
    [socketId: string]: RTCPeerConnection;
  }>({});
  const router = useRouter();
  const connectionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Main initialization effect
  useEffect(() => {
    // Log browser environment data in non-production environments only
    if (process.env.NODE_ENV !== 'production') {
      console.log('Browser environment:', {
        userAgent: navigator?.userAgent,
        mediaSupported: MediaAdapter?.isSupported || false,
        isSecureContext: window?.isSecureContext || false,
        isMobile: /Mobi|Android/i.test(navigator?.userAgent || '')
      });
      
      // Add environment-specific logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Browser environment:', {
          userAgent: navigator?.userAgent,
          mediaSupported: MediaAdapter?.isSupported || false,
          isSecureContext: window?.isSecureContext || false,
          isMobile: /Mobi|Android/i.test(navigator?.userAgent || '')
        });
      }
      
      // Add explicit warning about the dev:realtime requirement in development only
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '%c🔴 IMPORTANT: Streaming features require the realtime server 🔴',
          'background: #333; color: #ff9800; font-size: 14px; padding: 5px;'
        );
        console.warn(
          '%cPlease run the app with: npm run dev:realtime',
          'background: #333; color: #4caf50; font-size: 14px; padding: 5px;'
        );
      }
    }
    
    // Early return if host but no media support
    if (isHost && !MediaAdapter?.isSupported) {
      console.error('Host mode requested but media devices not supported');
      setError('Your browser does not support camera/microphone access. Please try a different browser like Chrome or Firefox.');
      setIsConnecting(false);
      return;
    }
    
    // Initial setup function
    const initialize = async () => {
      try {
        console.log('StreamInitializer: Initializing stream with ID:', streamId, 'isHost:', isHost);
        setIsConnecting(true);
        setError(null);
        
        // 1. Check media capabilities if host
        if (isHost && MediaAdapter) {
          const mediaStatus = await MediaAdapter.checkMediaDevices();
          console.log('Media capabilities check:', mediaStatus);
          
          if (!mediaStatus.hasVideo && !mediaStatus.hasAudio) {
            setError('No camera or microphone detected on your device');
            setIsConnecting(false);
            return;
          }
          
          // For hosts, immediately request camera permissions without waiting
          console.log('Host mode detected, immediately requesting camera permissions');
          const stream = await requestMediaPermissions();
          if (!stream) {
            console.error('Failed to get media stream during initialization');
            setError('Could not access your camera or microphone');
            setIsConnecting(false);
            return;
          }
        }
        
        // 2. Get local media stream if host - do this first, before any socket connections
        if (isHost && !localStreamRef.current) {
          try {
            // Check for secure context (required for most browsers)
            if (window?.isSecureContext === false) {
              console.error('Not running in a secure context - media access may be denied');
              toast.error('For camera access, please use HTTPS or localhost');
            }
            
            // Request permissions immediately, regardless of socket connection
            const stream = await requestMediaPermissions();

            // If we have a stream at this point, notify the parent
            if (stream) {
              localStreamRef.current = stream;
              onStreamReady(stream); // Notify parent even if socket connection fails
              console.log('Media stream ready, regardless of socket status');
            } else {
              console.error('Failed to get media stream during initialization');
              setError('Could not access your camera or microphone');
              setIsConnecting(false);
              return;
            }
          } catch (err: any) {
            console.error('Error accessing media devices:', err);
            setError(`Failed to access camera or microphone. ${err?.message || ''}`);
            setIsConnecting(false);
            return;
          }
        }

        // 3. Connect to signaling server (but don't block on this - we might be in development mode)
        try {
          console.log('Connecting to signaling server...');
          await connectToSignalingServer();
        } catch (socketErr) {
          console.error('Socket connection error:', socketErr);
          // Continue anyway, we already have the local stream working
          toast.error('Socket connection failed. Working in local preview mode only.', { duration: 3000 });
        }
        
        setIsConnecting(false);
      } catch (err: any) {
        console.error('Stream initialization error:', err);
        setError('Failed to initialize stream. Please try again.');
        setIsConnecting(false);
        toast.error('Failed to connect to stream');
      }
    };

    initialize();

    // Cleanup function
    return () => {
      console.log('Cleanup: Releasing stream resources...');
      cleanup();
    };
  }, [streamId, isHost]);
  
  // Add this helper function near the top of the file
  const checkPermissions = async () => {
    try {
      // First check if permissions API is available
      if (navigator.permissions && navigator.permissions.query) {
        // Check camera permission
        const cameraResult = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('Camera permission status:', cameraResult.state);
        
        // Check microphone permission
        const micResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('Microphone permission status:', micResult.state);
        
        return {
          camera: cameraResult.state === 'granted',
          microphone: micResult.state === 'granted'
        };
      }
      
      // Fallback for browsers that don't support permissions API
      return { camera: null, microphone: null };
    } catch (err) {
      console.warn('Error checking permissions:', err);
      return { camera: null, microphone: null };
    }
  };

  // Update the requestMediaPermissions function for a completely different Firefox approach
  const requestMediaPermissions = async () => {
    if (!MediaAdapter) {
      console.error('MediaAdapter not available');
      throw new Error('Media devices not supported in this browser');
    }
    
    // For non-host users, we don't need media permissions
    if (!isHost) {
      console.log('Viewer mode: Continuing without media');
      const emptyStream = new MediaStream();
      localStreamRef.current = emptyStream;
      onStreamReady(emptyStream);
      return emptyStream;
    }

    // If we already have a working stream, try to reuse it
    if (localStreamRef.current && localStreamRef.current.active) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      const audioTracks = localStreamRef.current.getAudioTracks();
      
      if (videoTracks.length > 0 || audioTracks.length > 0) {
        console.log('Reusing existing stream:', {
          videoTracks: videoTracks.length,
          audioTracks: audioTracks.length,
          videoActive: videoTracks.length > 0 ? videoTracks[0].enabled && videoTracks[0].readyState === 'live' : false,
          audioActive: audioTracks.length > 0 ? audioTracks[0].enabled && audioTracks[0].readyState === 'live' : false
        });
        
        // Only reuse if tracks are actually active
        if ((videoTracks.length === 0 || videoTracks[0].readyState === 'live') &&
            (audioTracks.length === 0 || audioTracks[0].readyState === 'live')) {
          onStreamReady(localStreamRef.current);
          return localStreamRef.current;
        } else {
          console.log('Existing stream has inactive tracks, requesting new stream');
          // Cleanup old stream before requesting new one
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
      }
    }
    
    try {
      // Check for secure context first
      if (window?.isSecureContext === false) {
        console.error('Not running in a secure context - media access may be denied');
        toast.error('For camera access, please use HTTPS or localhost');
      }
      
      // Check current permissions
      const permissions = await checkPermissions();
      console.log('Current permissions:', permissions);
      
      // Firefox-specific handling
      const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
      if (isFirefox) {
        console.log('Firefox detected, using specialized Firefox approach');
        
        // Create a stream container to hold our tracks
        const combinedStream = new MediaStream();
        let videoAdded = false;
        let audioAdded = false;
        
        try {
          // Reset permission cache in Firefox
          if (navigator.permissions && navigator.permissions.query) {
            try {
              // Trigger permission refresh
              await navigator.permissions.query({ name: 'camera' as PermissionName });
              await navigator.permissions.query({ name: 'microphone' as PermissionName });
            } catch (e) {
              console.warn('Error querying permissions:', e);
            }
          }
          
          // First attempt - try with MINIMAL constraints - Firefox is very picky
          console.log('Firefox: First attempt with minimal constraints');
          try {
            const basicStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true
            });
            
            if (basicStream && basicStream.getTracks().length > 0) {
              console.log('Firefox: Basic stream acquired successfully with tracks:', 
                basicStream.getTracks().map(t => `${t.kind}:${t.label}`));
              
              // Add all tracks to our combined stream
              basicStream.getTracks().forEach(track => {
                combinedStream.addTrack(track);
                if (track.kind === 'video') videoAdded = true;
                if (track.kind === 'audio') audioAdded = true;
              });
              
              // Return early if we got both audio and video
              if (videoAdded && audioAdded) {
                console.log('Firefox: Got both audio and video in first attempt');
                localStreamRef.current = combinedStream;
                onStreamReady(combinedStream);
                return combinedStream;
              }
            }
          } catch (basicErr) {
            console.warn('Firefox: First basic attempt failed:', basicErr);
            // Continue to fallbacks - don't stop here
          }
          
          // Second attempt - try video only
          if (!videoAdded) {
            console.log('Firefox: Trying video-only');
            try {
              const videoStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
              });
              
              if (videoStream && videoStream.getVideoTracks().length > 0) {
                console.log('Firefox: Video-only stream acquired');
                videoStream.getVideoTracks().forEach(track => {
                  combinedStream.addTrack(track);
                  videoAdded = true;
                });
              }
            } catch (videoErr) {
              console.warn('Firefox: Video-only attempt failed:', videoErr);
            }
          }
          
          // Third attempt - try audio only, but wait a short time
          if (!audioAdded) {
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('Firefox: Trying audio-only');
            try {
              const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
              });
              
              if (audioStream && audioStream.getAudioTracks().length > 0) {
                console.log('Firefox: Audio-only stream acquired');
                audioStream.getAudioTracks().forEach(track => {
                  combinedStream.addTrack(track);
                  audioAdded = true;
                });
              }
            } catch (audioErr) {
              console.warn('Firefox: Audio-only attempt failed:', audioErr);
            }
          }
          
          // Return whatever we have at this point
          console.log(`Firefox: Final stream has video: ${videoAdded}, audio: ${audioAdded}`);
          
          if (videoAdded || audioAdded) {
            localStreamRef.current = combinedStream;
            onStreamReady(combinedStream);
            
            // Show a toast if we're missing something
            if (!videoAdded) {
              toast('Could not access camera. Check Firefox permissions in browser settings.', { 
                duration: 5000,
                className: 'bg-amber-700'
              });
            }
            if (!audioAdded) {
              toast('Could not access microphone. Check Firefox permissions in browser settings.', { 
                duration: 5000,
                className: 'bg-amber-700'
              });
            }
            
            return combinedStream;
          }
          
          // If we got here, both attempts failed
          throw new Error('Failed to get any media in Firefox');
          
        } catch (err) {
          console.error('Firefox: All stream acquisition attempts failed:', err);
          
          // If we have a partial stream, still return it
          if (videoAdded || audioAdded) {
            console.log('Firefox: Returning partial stream despite errors');
            localStreamRef.current = combinedStream;
            onStreamReady(combinedStream);
            return combinedStream;
          }
          
          toast.error('Firefox permissions error. Try clicking the camera icon in your address bar.');
          
          // Last resort - empty stream
          const emptyStream = new MediaStream();
          localStreamRef.current = emptyStream;
          onStreamReady(emptyStream);
          return emptyStream;
        }
      }
      
      // Standard approach for other browsers
      try {
        console.log('Using standard approach for media access');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        if (stream && stream.active) {
          console.log('Standard stream obtained successfully');
          localStreamRef.current = stream;
          onStreamReady(stream);
          return stream;
        }
        
        throw new Error('Standard stream not active');
      } catch (err) {
        console.warn('Standard approach failed:', err);
        
        // Final fallback - empty stream
        console.log('All attempts failed, creating empty stream');
        const emptyStream = new MediaStream();
        localStreamRef.current = emptyStream;
        onStreamReady(emptyStream);
        
        // Show helpful error message
        if (isFirefox) {
          toast.error('Please check Firefox camera/microphone permissions in your browser settings');
        } else {
          toast.error('Could not access camera or microphone. Please check your browser settings.');
        }
        
        return emptyStream;
      }
    } catch (err) {
      console.error('Fatal media permissions error:', err);
      throw err;
    }
  };

  // Connect to signaling server
  const connectToSignalingServer = async () => {
    try {
      // Clear any existing timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = undefined;
      }
      
      // For development: check if we should just bypass the socket connection
      const isDev = process.env.NODE_ENV === 'development';
      
      // Only create fallback in development AND when explicitly enabled
      if (isDev && process.env.NEXT_PUBLIC_ENABLE_DEV_FALLBACK === 'true') {
        console.log('DEV MODE: Creating fallback stream immediately for development testing');
        createDevFallbackStream();
        return;
      }
      
      // Use configured socket URL, fallback to generated URL
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ||
        (typeof window !== 'undefined' ? window.location.origin : 'https://bourbonbuddy-eliasbouzeid-pmmes-projects.vercel.app');
      
      console.log('Connecting to socket server at:', socketUrl);
      
      // Close any existing connection before creating a new one
      if (socketRef.current) {
        console.log('Closing existing socket connection before reconnecting');
        socketRef.current.close();
        socketRef.current = null;
      }
      
      // When creating the socket, add fallback mechanism
      socketRef.current = io(socketUrl, {
        path: '/api/socketio',
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        autoConnect: true,
        forceNew: true
      });

      // Add explicit error handling
      socketRef.current.on('connect_error', (err) => {
        console.warn('Socket connection error, attempting fallback mechanism:', err.message);
        
        // Try reconnecting with polling only if there's a WebSocket issue
        if (err.message.includes('websocket')) {
          const fallbackSocket = io(socketUrl, {
            path: '/api/socketio',
            transports: ['polling'],
            reconnectionAttempts: 3,
            timeout: 30000,
            forceNew: true
          });
          
          // Replace the original socket with the fallback if it connects
          fallbackSocket.on('connect', () => {
            console.log('Fallback socket connected successfully');
            // Replace socket reference with the fallback
            socketRef.current = fallbackSocket;
          });
        }
      });

      // Set up connection event handlers
      socketRef.current.on('connect', () => {
        console.log('Socket connected successfully with ID:', socketRef.current?.id);
        
        // Clear any error states and timeout
        setError(null);
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = undefined;
        }
        
        // Join the stream room
        if (socketRef.current) {
          socketRef.current.emit('join-stream', { 
            streamId,
            isHost,
            userName: isHost ? 'Host' : 'Viewer' // Add username for identification
          });
          
          // Set up other event listeners
          setupSocketEventListeners(socketRef.current);
        }
      });

      // Handle confirmation of connection (may come from server)
      socketRef.current.on('connection_confirmed', (data) => {
        console.log('Connection confirmed from server:', data);
        // Clear any error states and timeout
        setError(null);
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = undefined;
        }
      });

      // Handle connection errors
      socketRef.current.on('connect_error', (err) => {
        console.error('Signaling socket connect_error:', err);
        
        // Provide more specific error messages based on error type
        let errorMessage = 'Connection error - please try running with "npm run dev:realtime"';
        
        if (err.message) {
          // Categorize common socket connection errors
          if (err.message.includes('xhr poll error')) {
            errorMessage = 'Server connection failed. Make sure the realtime server is running with "npm run dev:realtime"';
          } else if (err.message.includes('timeout')) {
            errorMessage = 'Connection timed out. Server might be slow or unreachable.';
          } else if (err.message.includes('not authorized')) {
            errorMessage = 'Authorization failed. Please try logging in again.';
          } else if (err.message.includes('websocket error') || err.message.includes('WebSocket')) {
            errorMessage = 'WebSocket connection error. Falling back to polling transport.';
            
            // Force Socket.IO to use only polling in this session since WebSockets are failing
            if (socketRef.current) {
              console.log('Switching to polling transport only due to WebSocket error');
              socketRef.current.io.opts.transports = ['polling'];
            }
          }
        }
        
        toast.error(errorMessage);
        
        // Don't set the error state yet, as this might be a temporary issue
        // and we'll give it a chance to reconnect
        
        // If in development mode, offer the option to continue without socket
        if (isDev) {
          // Only ask once every few seconds to avoid spamming the user
          if (!connectionTimeoutRef.current) {
            const devContinueWithoutSocket = process.env.NODE_ENV === 'development' && window.confirm(
              'Development Mode: Socket connection failed. Would you like to continue without a socket connection for testing?\n\n' +
              'This will enable a local fallback mode for development only.'
            );
            
            if (devContinueWithoutSocket) {
              // Save this preference for future use
              try {
                localStorage.setItem('dev_skip_socket', 'true');
              } catch (e) {
                console.log('Could not access localStorage, continuing anyway');
              }
              
              // Clean up any existing socket
              if (socketRef.current) {
                try {
                  socketRef.current.disconnect();
                  socketRef.current = null;
                } catch (e) {
                  console.log('Error disconnecting socket:', e);
                }
              }
              
              // Clear any pending timeouts
              if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = undefined;
              }
              
              createDevFallbackStream();
              return;
            }
          }
        }
        
        // Try an alternative transport method if the connection fails
        if (socketRef.current) {
          console.log('Trying alternative transport method...');
          // Force polling which might work better in some environments
          socketRef.current.io.opts.transports = ['polling'];
          
          // Attempt to reconnect manually
          setTimeout(() => {
            if (socketRef.current && socketRef.current.connected === false) {
              socketRef.current.connect();
            }
          }, 2000);
        }
      });
      
      // Add timeout for connection with longer delay
      // This will trigger a user-friendly error message if connection takes too long
      connectionTimeoutRef.current = setTimeout(() => {
        // Only execute this if socket still isn't connected
        if (socketRef.current && !socketRef.current.connected) {
          console.log('Socket connection timeout after 10 seconds');
          
          // Create a more descriptive error for timeout situations
          const timeoutError = 'Connection timed out. Please make sure:' +
                              '\n1. The server is running with "npm run dev:realtime"' +
                              '\n2. You\'re not blocked by a firewall or network restriction' +
                              '\n3. The API endpoints are accessible from your network';
          
          toast.error('Connection timed out. Please check server status and network.');
          
          // In development mode, create a dev fallback and offer to skip socket in the future
          if (isDev) {
            // Only prompt once
            const devContinueWithoutSocket = process.env.NODE_ENV === 'development' && window.confirm(
              'Development Mode: Socket connection timed out. Would you like to continue without a socket connection for testing?\n\n' +
              'This will enable a local fallback mode for development only.'
            );
            
            if (devContinueWithoutSocket) {
              // Save this preference for future use
              try {
                localStorage.setItem('dev_skip_socket', 'true');
              } catch (e) {
                console.log('Could not access localStorage, continuing anyway');
              }
              
              // Clean up existing socket connection attempts
              if (socketRef.current) {
                try {
                  socketRef.current.disconnect();
                  socketRef.current = null;
                } catch (e) {
                  console.log('Error disconnecting socket:', e);
                }
              }
              
              // Clear the timeout reference
              connectionTimeoutRef.current = undefined;
              
              // Create fallback stream
              createDevFallbackStream();
              return;
            } else {
              // User doesn't want to use fallback, so show the error
              setError(timeoutError);
            }
          } else {
            // In production, just show the error
            setError(timeoutError);
          }
          
          // Try reconnecting one more time
          if (socketRef.current) {
            console.log('Attempting final reconnection...');
            // Try with just polling as a last resort
            socketRef.current.io.opts.transports = ['polling'];
            socketRef.current.connect();
            
            // If this doesn't work, let the reconnection logic in socket.io handle it
          }
        }
      }, 10000); // 10 seconds is usually enough to determine if there's a connection issue
    } catch (error) {
      console.error('Failed to connect to signaling server:', error);
      
      // Set more appropriate error message based on environment
      if (process.env.NODE_ENV === 'production') {
        setError('Unable to connect to streaming server. Please try again later.');
        toast.error('Connection failed. Please try again later.');
      } else {
        setError('Failed to connect to signaling server. Please check that you\'re running the app with "npm run dev:realtime"');
        toast.error('Connection failed. Please try running with "npm run dev:realtime"');
      }
      
      // In development, offer fallback
      if (process.env.NODE_ENV !== 'production') {
        createDevFallbackStream();
      }
    }
    
    // Return a cleanup function that clears the timeout
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = undefined;
      }
    };
  };
  
  // Helper function to create a development fallback stream when socket is unavailable
  const createDevFallbackStream = () => {
    // This function should never run in production
    if (process.env.NODE_ENV !== 'development') {
      console.error('Attempted to use development fallback outside of development environment');
      setError('Connection error: Unable to connect to streaming server. Please try again later.');
      setIsConnecting(false);
      return;
    }
    
    console.log('DEV MODE: Creating fallback mock stream for testing without socket connection');
    
    // Create a mock local stream and pass it to the caller
    try {
      // Clear any previous error states
      setError(null);
      
      // Try to get a real camera stream first for better development experience
      console.log('DEV MODE: First trying to get real camera stream');
      
      if (MediaAdapter && isHost) {
        MediaAdapter.getUserMedia({ video: true, audio: true })
          .then(realStream => {
            console.log('DEV MODE: Successfully got real camera stream');
            localStreamRef.current = realStream;
            
            // Add delay to avoid race condition with video element updates
            setTimeout(() => {
              if (realStream && realStream.active) {
                onStreamReady(realStream);
              }
            }, 150);
            
            // Simulate changing viewer count only in dev mode
            if (process.env.NODE_ENV === 'development') {
              simulateViewerActivity();
            }
          })
          .catch(err => {
            console.log('DEV MODE: Could not get real camera, falling back to canvas:', err);
            createCanvasFallback();
          });
      } else {
        createCanvasFallback();
      }
      
      // Set connecting to false to continue with the app
      setIsConnecting(false);
      return;
    } catch (fallbackErr) {
      console.error('Failed to create fallback stream:', fallbackErr);
      createEmptyFallback();
    }
  };
  
  // Helper function to create canvas-based fallback
  const createCanvasFallback = () => {
    // Create a canvas for the mock video (this is the most reliable approach)
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw a professional looking test pattern
      // Background
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Header
      ctx.fillStyle = 'rgba(59, 130, 246, 0.7)'; // Blue
      ctx.fillRect(0, 0, canvas.width, 60);
      
      // Text
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText('DEVELOPMENT MODE', canvas.width/2, 40);
      
      // Subtext
      ctx.font = '20px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText('Socket Connection Bypassed', canvas.width/2, 100);
      
      // Info text
      ctx.font = '16px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('This is a local fallback stream for development', canvas.width/2, 140);
      ctx.fillText('Bourbon Buddy Testing Environment', canvas.width/2, 170);
      
      let mockStream: MediaStream | null = null;
      
      // Use captureStream API if available (most modern browsers)
      if (canvas.captureStream) {
        mockStream = canvas.captureStream(30); // 30fps for smoother video
        console.log('Created canvas-based mock stream:', mockStream);
        
        // Add animation to make it feel more real
        const updateCanvas = () => {
          // Update timestamp
          const now = new Date();
          ctx.fillStyle = 'black';
          ctx.fillRect(10, 200, 300, 30);
          ctx.font = '16px Arial';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'left';
          ctx.fillText(`Time: ${now.toLocaleTimeString()}`, 20, 220);
          
          // Request next frame for animation
          requestAnimationFrame(updateCanvas);
        };
        
        // Start animation
        updateCanvas();
      } else {
        // Fallback for browsers without captureStream
        console.log('Canvas captureStream not supported, creating empty stream');
        mockStream = new MediaStream();
      }
      
      // Save reference and call callback with delay
      if (mockStream) {
        localStreamRef.current = mockStream;
        
        // Add delay to avoid race condition with video element
        setTimeout(() => {
          if (mockStream) {
            onStreamReady(mockStream);
          }
        }, 150);
      }
      
      simulateViewerActivity();
      
      // Show a helpful toast
      toast.success('DEV MODE: Using fallback stream - Socket server not required', { duration: 3000 });
    } else {
      createEmptyFallback();
    }
  };
  
  // Helper function to create empty fallback stream
  const createEmptyFallback = () => {
    // Last resort - empty stream
    console.log('DEV MODE: Creating empty MediaStream as last resort');
    const emptyStream = new MediaStream();
    localStreamRef.current = emptyStream;
    
    setTimeout(() => {
      onStreamReady(emptyStream);
    }, 150);
    
    setIsConnecting(false);
    setError(null);
    toast.success('DEV MODE: Using empty stream', { duration: 3000 });
    
    simulateViewerActivity();
  };
  
  // Helper function to simulate changing viewer counts
  const simulateViewerActivity = () => {
    // Setup simulated viewers
    let viewerCount = Math.floor(Math.random() * 10) + 1;
    onViewerCount(viewerCount);
    
    // Simulate changing viewer count
    setInterval(() => {
      const change = Math.random() > 0.5 ? 1 : -1;
      viewerCount = Math.max(1, viewerCount + change);
      onViewerCount(viewerCount);
    }, 5000);
    
    // Clear the timeout and set connecting to false
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = undefined;
    }
  };

  // Handle WebRTC signals
  const handleSignal = async (data: any) => {
    try {
      const { from, signal, type } = data;
      if (!from || !signal || !type) return;
      
      // Create new peer connection if needed
      if (!peerConnectionsRef.current[from]) {
        peerConnectionsRef.current[from] = createPeerConnection(from);
      }
      
      const pc = peerConnectionsRef.current[from];
      if (!pc) return;
      
      // Handle signal by type
      switch (type) {
        case 'offer':
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current?.emit('signal', {
            to: from,
            signal: pc.localDescription,
            type: 'answer'
          });
          break;
          
        case 'answer':
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          break;
          
        case 'ice-candidate':
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal));
          }
          break;
      }
    } catch (err) {
      console.error('Signal handling error:', err);
    }
  };

  // Create WebRTC peer connection
  const createPeerConnection = (socketId: string) => {
    // Simple configuration that works across browsers
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    // Add local tracks for hosts
    if (isHost && localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        localStreamRef.current && pc.addTrack(track, localStreamRef.current);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = event => {
      if (event.candidate) {
        socketRef.current?.emit('signal', {
          to: socketId,
          signal: event.candidate,
          type: 'ice-candidate'
        });
      }
    };
    
    // Handle incoming stream for viewers
    pc.ontrack = event => {
      if (!isHost && event.streams && event.streams[0]) {
        onStreamReady(event.streams[0]);
      }
    };
    
    // Handle negotiation for hosts
    pc.onnegotiationneeded = async () => {
      if (isHost) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit('signal', {
            to: socketId,
            signal: pc.localDescription,
            type: 'offer'
          });
        } catch (err) {
          console.error('Negotiation error:', err);
        }
      }
    };
    
    return pc;
  };

  // Clean up function
  const cleanup = () => {
    console.log('Cleaning up StreamInitializer resources', {
      isHost,
      hasLocalStream: !!localStreamRef.current,
      socketConnected: !!socketRef.current?.connected
    });
    
    // NEVER clean up host streams, only cleanup for non-hosts or on page unmount
    if (!isHost) {
      console.log('Non-host cleanup, releasing all streams');
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          console.log(`Stopping ${track.kind} track:`, track.label);
          track.stop();
        });
        localStreamRef.current = null;
      }
    } else {
      console.log('Host cleanup, preserving all media streams');
    }
    
    // Clean up WebSocket monkey patch
    if (typeof window !== 'undefined' && (window as any)._originalWebSocket) {
      console.log('Restoring original WebSocket constructor');
      window.WebSocket = (window as any)._originalWebSocket;
      delete (window as any)._originalWebSocket;
    }
    
    // Properly disconnect socket if we have one
    if (socketRef.current) {
      try {
        console.log('Disconnecting socket');
        socketRef.current.disconnect();
      } catch (e) {
        console.error('Error disconnecting socket:', e);
      }
      socketRef.current = null;
    }
    
    // Clean up peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => {
      try {
        if (pc) {
          pc.close();
        }
      } catch (e) {
        console.error('Error closing peer connection:', e);
      }
    });
    peerConnectionsRef.current = {};
    
    console.log('StreamInitializer cleanup complete');
  };

  // Set up socket event listeners
  const setupSocketEventListeners = (socket: Socket) => {
    if (!socket) return;
    
    // Handle viewer count updates
    socket.on('viewer-count', (count: number) => {
      console.log('Received viewer count update:', count);
      onViewerCount(count);
    });
    
    // Handle errors
    socket.on('error', (errorData: any) => {
      console.error('Socket error event:', errorData);
      const errorMessage = typeof errorData === 'string' 
        ? errorData 
        : errorData?.message || 'Unknown socket error';
      
      // Check if this is a websocket error
      const isWebSocketError = typeof errorMessage === 'string' && 
        (errorMessage.toLowerCase().includes('websocket') || errorMessage.toLowerCase().includes('ws'));
      
      if (isWebSocketError) {
        toast.error(`WebSocket error: Falling back to polling transport.`);
        
        // Force polling only mode
        if (socket.io) {
          console.log('Switching to polling transport only due to WebSocket error from error event');
          socket.io.opts.transports = ['polling'];
          
          // Try to reconnect
          setTimeout(() => {
            if (!socket.connected) {
              socket.connect();
            }
          }, 1000);
        }
      } else {
        toast.error(`Stream error: ${errorMessage}`);
      }
    });
    
    // Handle reconnection
    socket.on('reconnect', (attemptNumber: number) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      
      // Re-join the stream room after reconnection
      socket.emit('join-stream', { streamId });
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      console.log(`Socket disconnected: ${reason}`);
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        console.log('Server disconnected, attempting to reconnect');
        socket.connect();
      }
    });
    
    // Handle transport error
    socket.io.engine.on('error', (err: any) => {
      console.error('Socket transport error:', err);
      
      // Check if this is a websocket error
      const errorMessage = err?.message || String(err);
      const isWebSocketError = errorMessage.toLowerCase().includes('websocket') || 
                             errorMessage.toLowerCase().includes('ws');
      
      if (isWebSocketError) {
        toast.error('WebSocket transport error. Switching to polling.');
        
        // Force polling only mode
        socket.io.opts.transports = ['polling'];
      }
    });
  };

  // Handle loading/error states
  if (error) {
    return (
      <div className="rounded-lg bg-gray-800 p-6 text-center">
        <div className="text-red-500 mb-4 font-semibold">{error}</div>
        
        {process.env.NODE_ENV === 'development' ? (
          <div className="text-amber-300 mb-4 text-sm">
            <p className="mb-2">This feature requires the realtime server to be running.</p>
            <div className="bg-gray-900 p-3 rounded-md text-left mb-3 overflow-x-auto">
              <code className="text-green-400">npm run dev:realtime</code>
            </div>
            <p>Please restart your development server with the command above.</p>
          </div>
        ) : (
          <div className="text-gray-300 mb-4 text-sm">
            <p>Please try again in a few moments.</p>
            <p>If the problem persists, contact support.</p>
          </div>
        )}
        
        <button
          onClick={() => router.refresh()}
          className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors mb-4"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="rounded-lg bg-gray-800 p-6 text-center">
        <div className="animate-pulse text-white mb-2">
          {isHost ? 'Preparing your stream...' : 'Connecting to stream...'}
        </div>
        <div className="w-8 h-8 border-t-2 border-b-2 border-amber-500 rounded-full animate-spin mx-auto"></div>
        
        {isHost && (
          <p className="text-gray-400 text-sm mt-4">
            Waiting for camera and microphone permissions...
          </p>
        )}
      </div>
    );
  }

  // Render nothing when connected successfully
  return null;
} 