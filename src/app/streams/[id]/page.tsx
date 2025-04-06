'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { WebRTCService, StreamMetrics } from '@/lib/webrtc';
import { useSocket } from '@/hooks/useSocket';
import { 
  Mic, MicOff, Video, VideoOff, Send, Users, 
  Activity, Maximize, Minimize, ChevronRight, ChevronLeft, Loader2,
  ThumbsUp, MessageSquare, Share2, Flag, Clock, User, Menu,
  Expand, Award, GlassWater, ChevronDown, ChevronUp, Droplets
} from 'lucide-react';
import StreamInitializer from '@/components/streaming/StreamInitializer';
import HostControls from '@/components/streaming/HostControls';
import ChatBox from '@/components/streaming/ChatBox';
import StreamInteractions from '@/components/streaming/StreamInteractions';
import Link from 'next/link';

// Polyfill for older browsers that might not have navigator.mediaDevices
const ensureMediaDevicesPolyfill = () => {
  if (typeof window !== 'undefined' && navigator) {
    // Handle TypeScript type checking by using 'any' for the polyfill operation
    const nav = navigator as any;
    
    if (!nav.mediaDevices) {
      console.log('Polyfilling mediaDevices for older browsers');
      nav.mediaDevices = {};
    }

    // Some browsers partially implement mediaDevices. We need getUserMedia.
    if (!nav.mediaDevices.getUserMedia) {
      // Add legacy methods as a fallback
      nav.mediaDevices.getUserMedia = function(constraints: MediaStreamConstraints) {
        const getUserMedia = nav.webkitGetUserMedia || nav.mozGetUserMedia;
        
        if (!getUserMedia) {
          console.warn('getUserMedia is not implemented in this browser');
          
          // Development mode fallback - return a mock implementation
          if (process.env.NODE_ENV === 'development') {
            console.log('Development mode: Providing mock getUserMedia implementation');
            
            // Check if audio or video was requested
            const hasVideo = constraints && (constraints as any).video;
            const hasAudio = constraints && (constraints as any).audio;
            
            if (!hasVideo && !hasAudio) {
              return Promise.reject(new Error('No media requested'));
            }
            
            // If we're in development, try to create a mock media stream
            try {
              // Mock canvas-based media stream (may still fail in some browsers)
              const mockCanvas = document.createElement('canvas');
              mockCanvas.width = 640;
              mockCanvas.height = 480;
              const ctx = mockCanvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, mockCanvas.width, mockCanvas.height);
                
                // Try to create a stream from the canvas if video is requested
                if (hasVideo && mockCanvas.captureStream) {
                  const mockStream = mockCanvas.captureStream();
                  console.log('Created mock media stream for development:', mockStream);
                  return Promise.resolve(mockStream);
                }
              }
            } catch (e) {
              console.warn('Failed to create mock media stream:', e);
            }
          }
          
          // If no fallback worked or not in development, reject with a more specific error
          return Promise.reject(new Error('Media devices API not available in this browser. For development, try using Chrome or Firefox.'));
        }

        // Adapt the legacy API for Promise-based usage
        return new Promise(function(resolve, reject) {
          getUserMedia.call(nav, constraints, resolve, reject);
        });
      };
    }

    console.log('MediaDevices polyfill check completed');
  }
};

// Run polyfill immediately
if (typeof window !== 'undefined') {
  ensureMediaDevicesPolyfill();
}

interface Stream {
  id: string;
  title: string;
  description?: string;
  hostId: string;
  host: {
    name: string;
    avatar?: string;
    email: string;
  };
  spiritId?: string;
  spirit?: {
    name: string;
    type: string;
    brand: string;
  };
  isLive: boolean;
  startedAt: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: {
    name: string;
    avatar?: string;
  };
  timestamp: Date;
}

interface Comment {
  id: string;
  content: string;
  user: {
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  likes: number;
  replies?: Comment[];
}

export default function StreamPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const router = useRouter();
  const { data: session, status } = useSession({ required: true });
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>('new');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamMetrics, setStreamMetrics] = useState<StreamMetrics | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [videoSize, setVideoSize] = useState<'normal' | 'medium'>('normal');
  const [activeTab, setActiveTab] = useState<'about' | 'comments'>('about');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [webSocketError, setWebSocketError] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<{
    camera: boolean;
    microphone: boolean;
  }>({
    camera: false,
    microphone: false
  });
  const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(false);
  const [isBackgroundBlurred, setIsBackgroundBlurred] = useState(false);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const streamStartedRef = useRef<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const webrtcRef = useRef<WebRTCService | null>(null);
  const socket = useSocket(id);
  
  // Mounted state to solve hydration issues
  const [isMounted, setIsMounted] = useState(false);
  
  // Set mounted state after component mounts on client
  useEffect(() => {
    setIsMounted(true);
    
    // Check browser compatibility with media devices early
    const checkBrowserCompatibility = () => {
      try {
        // Ensure polyfill is applied first
        ensureMediaDevicesPolyfill();
        
        // Check secure context (needed for getUserMedia)
        const isSecureContext = window?.isSecureContext;
        
        // More comprehensive check for getUserMedia
        const hasGetUserMedia = !!(
          (navigator && 
          ((navigator as any).mediaDevices && 
          (navigator as any).mediaDevices.getUserMedia)) ||
          (navigator as any).webkitGetUserMedia || 
          (navigator as any).mozGetUserMedia
        );
        
        const isMobile = /Mobi|Android/i.test(navigator?.userAgent || '');
        const isIOS = /iPad|iPhone|iPod/.test(navigator?.userAgent || '');
        const isFirefox = /Firefox/.test(navigator?.userAgent || '');
        const isChrome = /Chrome/.test(navigator?.userAgent || '') && !/Edge/.test(navigator?.userAgent || '');
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator?.userAgent || '');
        
        console.log('Browser compatibility check:', {
          isSecureContext,
          hasGetUserMedia,
          isMobile,
          isIOS,
          isFirefox,
          isChrome,
          isSafari,
          userAgent: navigator?.userAgent
        });
        
        // If we're missing critical features, show warnings
        if (!hasGetUserMedia) {
          console.warn('getUserMedia not supported - streaming will be limited');
          toast.error('Your browser may not support camera access. For best results, use Chrome, Firefox, or Safari.');
        }
        
        if (!isSecureContext) {
          console.warn('Not running in a secure context');
          toast.error('Camera access requires a secure connection (HTTPS or localhost)');
        }
        
        // iOS Safari has special considerations
        if (isIOS && isSafari) {
          console.warn('iOS Safari detected - video streaming limitations may apply');
          toast('iOS Safari has limited streaming support. For best results, use Chrome on desktop.', { icon: '⚠️' });
        }
      } catch (error) {
        console.error('Error during browser compatibility check:', error);
      }
    };
    
    // Run compatibility check
    if (typeof window !== 'undefined') {
      checkBrowserCompatibility();
    }
    
    // Clean up resources when component unmounts
    return () => {
      console.log('UNMOUNTING STREAM PAGE: Cleaning up all resources');
      
      // Store references to avoid null issues during cleanup
      const currentLocalStream = localStream;
      const currentWebRTC = webrtcRef.current;
      const currentSocket = socket;
      
      // Stop all tracks to release camera
      if (currentLocalStream) {
        console.log('Stopping local stream tracks on unmount');
        currentLocalStream.getTracks().forEach(track => {
          console.log(`Stopping track ${track.kind} on unmount`);
          try {
            track.stop();
          } catch (err) {
            console.error('Error stopping track:', err);
          }
        });
      }
      
      // Clean up WebRTC
      if (currentWebRTC) {
        console.log('Stopping WebRTC service on unmount');
        try {
          currentWebRTC.stop();
        } catch (err) {
          console.error('Error stopping WebRTC service:', err);
        }
      }
      
      // Disconnect socket
      if (currentSocket) {
        console.log('Disconnecting socket on unmount');
        try {
          currentSocket.disconnect();
        } catch (err) {
          console.error('Error disconnecting socket:', err);
        }
      }
      
      // Reset state references
      setLocalStream(null);
      streamStartedRef.current = false;
      console.log('UNMOUNT CLEANUP COMPLETE');
    };
  }, []);

  // Fetch stream data
  useEffect(() => {
    if (session && isMounted && id) {
      fetchStream();
    }
  }, [id, session, isMounted]);

  // Set up video element with stream
  useEffect(() => {
    if (videoRef.current && localStream) {
      console.log('Setting video srcObject with localStream:', localStream);
      
      try {
        // Try to set the srcObject directly
        videoRef.current.srcObject = localStream;
        
        // Add event listeners to debug video element issues
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, attempting to play');
          
          // Ensure video starts playing
          videoRef.current?.play().catch(err => {
            console.error('Error auto-playing video:', err);
            
            // Show a user interaction button if autoplay fails
            if (err.name === 'NotAllowedError') {
              toast.error('Autoplay blocked. Please click on the video to start playback.');
            }
          });
        };
        
        videoRef.current.onerror = (e) => {
          console.error('Video element error:', e);
          toast.error('Error loading video stream. Please refresh and try again.');
        };
        
        // Try to manually call play in case it's needed
        if (videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          videoRef.current.play().catch(err => 
            console.warn('Initial play attempt failed, waiting for user interaction:', err)
          );
        }
      } catch (err) {
        console.error('Error setting video source:', err);
        toast.error('Failed to connect video stream to player');
      }
    } else if (!localStream) {
      console.warn('No localStream available yet for video element');
    }
  }, [localStream]);

  // Effect to adjust the layout on video size change
  useEffect(() => {
    if (videoSize === 'medium' && videoContainerRef.current) {
      scrollToVideoContainer();
    }
    
    // Reset chat scrolling when changing layouts
    if (chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
      }, 100);
    }
  }, [videoSize]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);

  // Add global error handler for WebSocket errors
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create a global error handler for WebSocket errors
      const originalWebSocketConstructor = window.WebSocket;
      
      // Monkey patch WebSocket constructor to add our error handling
      // @ts-ignore - We're intentionally monkeypatching to catch errors
      window.WebSocket = function(url: string, protocols?: string | string[]) {
        const ws = new originalWebSocketConstructor(url, protocols);
        
        // Add our error handler
        ws.addEventListener('error', (e) => {
          console.error('WebSocket error intercepted:', e);
          setWebSocketError(true);
          
          // Ensure we have a local video feed even if the socket fails
          if (isHost && !localStream) {
            console.log('WebSocket failed but continuing with local camera preview');
            // Get a local stream directly, bypassing the socket
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
              .then(stream => {
                console.log('Successfully obtained local camera feed despite WebSocket error');
                setLocalStream(stream);
                streamStartedRef.current = true;
                
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  videoRef.current.muted = true;
                  videoRef.current.play().catch(err => 
                    console.warn('Could not autoplay local video after WebSocket error:', err)
                  );
                }
                
                toast.success('Local camera preview ready (offline mode)');
              })
              .catch(err => {
                console.error('Failed to get camera access after WebSocket error:', err);
                toast.error('Failed to access camera. Please check permissions and try again.');
              });
          }
          
          // Show a helpful toast only once
          toast((t) => (
            <div>
              <p className="font-bold">WebSocket connection failed</p>
              <p className="text-sm">You can still use the camera in offline mode, but viewers won't be able to connect. Try refreshing or running the app with: <code className="bg-gray-700 px-1 py-0.5 rounded">npm run dev:realtime</code></p>
              <button 
                onClick={() => { 
                  toast.dismiss(t.id);
                  window.location.reload();
                }}
                className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 mr-2"
              >
                Refresh
              </button>
              <button 
                onClick={() => { toast.dismiss(t.id); }}
                className="mt-2 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
              >
                Dismiss
              </button>
            </div>
          ), { 
            duration: 15000,
            icon: '⚠️'
          });
        });
        
        return ws;
      };
      
      // Preserve the prototype and properties
      window.WebSocket.prototype = originalWebSocketConstructor.prototype;
      Object.defineProperties(window.WebSocket, Object.getOwnPropertyDescriptors(originalWebSocketConstructor));
      
      // Store for cleanup
      (window as any)._originalWebSocket = originalWebSocketConstructor;
      
      return () => {
        // Restore original WebSocket on cleanup
        if ((window as any)._originalWebSocket) {
          window.WebSocket = (window as any)._originalWebSocket;
          delete (window as any)._originalWebSocket;
        }
      };
    }
  }, [isHost, localStream]);

  const handleWebRTCError = (error: Error) => {
    console.error('WebRTC error:', error);
    
    // Check if this is a WebSocket-related error
    if (error.message.toLowerCase().includes('websocket') || 
        error.message.toLowerCase().includes('connection') ||
        error.message.toLowerCase().includes('network')) {
      setWebSocketError(true);
      toast.error('Network connection issues detected. Camera preview will work, but streaming may be limited.');
    } else {
      toast.error(`Streaming error: ${error.message}`);
    }
    
    setStreamError(error.message);
  };

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.on('offer', async ({ offer, from }) => {
      console.log('Received offer from:', from);
      
      if (!webrtcRef.current) {
        webrtcRef.current = new WebRTCService({
          onConnectionStateChange: setConnectionState,
          onIceConnectionStateChange: setIceConnectionState,
          onError: handleWebRTCError,
          onMetricsUpdate: setStreamMetrics,
        });
      }
      
      try {
        // For viewers receiving an offer from the host
        if (!isHost) {
          await webrtcRef.current.handleRemoteOffer(offer);
          
          // Get local stream for the answer
          const mediaStream = await webrtcRef.current.startLocalStream();
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          
          // Create and send answer back to host
          const answer = await webrtcRef.current.createAnswer();
          console.log('Sending answer to host');
          
          socket.emit('answer', {
            streamId: id,
            answer,
            to: from,
          });
        }
      } catch (error) {
        console.error('Error handling offer:', error);
        toast.error('Failed to connect to stream');
      }
    });

    socket.on('answer', async ({ answer, from }) => {
      console.log('Received answer from viewer:', from);
      if (webrtcRef.current && isHost) {
        try {
          await webrtcRef.current.handleAnswer(answer);
          console.log('Successfully set remote description with answer');
        } catch (error) {
          console.error('Error handling answer:', error);
        }
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      console.log('Received ICE candidate');
      if (webrtcRef.current) {
        try {
          await webrtcRef.current.handleIceCandidate(candidate);
        } catch (error) {
          console.error('Error handling ICE candidate:', error);
        }
      }
    });

    socket.on('participant-count', (count: number) => {
      setParticipantCount(count);
    });

    socket.on('chat-message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('error', (error: string) => {
      toast.error(`Socket error: ${error}`);
      setStreamError(error);
    });
  };

  const fetchStream = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        throw new Error('Stream ID is missing');
      }

      const response = await fetch(`/api/streams/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch stream data' }));
        throw new Error(errorData.error || 'Failed to fetch stream data');
      }
      
      const data = await response.json();
      
      // Make sure we have valid data before proceeding
      if (!data || !data.stream) {
        throw new Error('Invalid stream data received');
      }

      console.log('Stream data:', data);
      
      // Validate that host data exists before setting the stream
      if (!data.stream.host || !data.stream.host.name) {
        // Create a default host if missing
        data.stream.host = {
          name: 'Host',
          email: '',
          ...data.stream.host
        };
      }
      
      setStream(data.stream);
      
      const userIsHost = session?.user?.email === data.stream.host.email;
      setIsHost(userIsHost);
      
      if (userIsHost) {
        console.log('User is host of this stream');
        
        // Reset streaming state for host to ensure button is enabled
        setIsStreaming(data.stream.isLive);
        
        // Enable camera access request for host when button is clicked
        if (!data.stream.isLive) {
          console.log('Stream is not live, enabling Go Live button for host');
          // Don't set streamStartedRef.current to true yet - will be set when button is clicked
        }
      } else {
        console.log('User is viewer of this stream');
      }
    } catch (err) {
      console.error('Error fetching stream:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stream. Please try again.');
      toast.error('Failed to load stream');
    } finally {
      setLoading(false);
    }
  };

  const startStream = async () => {
    try {
      setStreamError(null);
      toast('Requesting camera and microphone access...');
      
      // First try to get user media permission explicitly
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        // Don't stop this as we'll use it
        console.log('Camera and microphone permissions granted');
        
        if (videoRef.current) {
          videoRef.current.srcObject = tempStream;
          videoRef.current.muted = true; // Always mute our own audio to prevent feedback
        }
        
        if (!webrtcRef.current) {
          webrtcRef.current = new WebRTCService({
            onConnectionStateChange: setConnectionState,
            onIceConnectionStateChange: setIceConnectionState,
            onError: handleWebRTCError,
            onMetricsUpdate: setStreamMetrics,
          });
          
          // Use this stream directly
          await webrtcRef.current.setLocalStream(tempStream);
        }
        
        setIsStreaming(true);
        toast('Stream started successfully');

        // Create and send offer to all participants
        const offer = await webrtcRef.current.createOffer();
        if (socket && offer) {
          socket.emit('offer', {
            streamId: id,
            offer,
          });
          console.log('Offer sent to participants');
        }
      } catch (permissionError) {
        console.error('Media permission error:', permissionError);
        toast.error('Could not access camera or microphone. Please check your permissions.');
        setStreamError('Media access denied. Please check your browser permissions.');
        return;
      }
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      toast.error(`Failed to access camera and microphone: ${error.message}`);
      setStreamError('Failed to access camera and microphone. Please ensure you have allowed camera and microphone permissions in your browser settings.');
    }
  };

  const stopStream = () => {
    console.log('Stopping all stream resources and tracks');
    
    // First, stop all media tracks
    if (localStream) {
      console.log('Stopping local stream tracks');
      localStream.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind}`, track);
        try {
          // Mark as ended for good measure
          track.enabled = false;
          track.stop();
        } catch (err) {
          console.error('Error stopping track:', err);
          // Continue with other tracks even if one fails
        }
      });
      // Important: set to null AFTER stopping
      setLocalStream(null);
    }
    
    // Then clean up WebRTC connection
    if (webrtcRef.current) {
      console.log('Stopping WebRTC service');
      try {
        webrtcRef.current.stop();
        webrtcRef.current = null;
      } catch (err) {
        console.error('Error stopping WebRTC service:', err);
      }
    }
    
    // Reset stream state
    streamStartedRef.current = false;
    setIsMuted(false);
    setIsCameraOff(false);
    setIsStreaming(false);
    
    // Finally disconnect socket to leave the room
    if (socket) {
      console.log('Disconnecting socket');
      try {
        socket.disconnect();
      } catch (err) {
        console.error('Error disconnecting socket:', err);
      }
    }
    
    // Clear video element source to help release resources
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (err) {
        console.error('Error clearing video element source:', err);
      }
    }

    // Force browser to fully release hardware
    try {
      // Method 1: Revoke permissions using permissions API if available
      if (navigator.permissions) {
        try {
          console.log('Checking for permission revocation capability');
          // Check if the browser supports revoking permissions
          // This is a future API that's not widely supported yet
          const permissionsWithRevoke = navigator.permissions as any;
          if (permissionsWithRevoke.revoke && typeof permissionsWithRevoke.revoke === 'function') {
            console.log('Permission revocation API found, attempting to revoke camera and mic');
            // Use any type to bypass TypeScript checking for this experimental API
            permissionsWithRevoke.revoke({ name: 'camera' } as any)
              .catch((e: Error) => console.log('Camera revoke not supported:', e));
            permissionsWithRevoke.revoke({ name: 'microphone' } as any)
              .catch((e: Error) => console.log('Mic revoke not supported:', e));
          } else {
            console.log('Permission revocation not supported in this browser');
          }
        } catch (e) {
          console.log('Permission revocation not supported in this browser:', e);
        }
      }

      // Method 2: Create and immediately stop a new stream
      // This ensures any previous hanging tracks are released
      console.log('Forcing hardware release with temporary stream');
      navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(tempStream => {
          tempStream.getTracks().forEach(track => {
            track.stop();
          });
          console.log('Hardware permissions successfully released');
        })
        .catch(err => {
          // This is normal if permissions were already revoked
          console.log('Unable to create temporary stream (probably already released):', err.name);
        });
    } catch (e) {
      console.error('Error during permission cleanup:', e);
    }
    
    // Force garbage collection of any remaining references (helps in some browsers)
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).gc) {
        try {
          (window as any).gc();
        } catch (e) {
          // Ignore if gc() is not available
        }
      }
    }, 1000);
    
    toast.success('Stream ended and camera/microphone turned off');
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
      toast(`Microphone ${!isMuted ? 'muted' : 'unmuted'}`);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
      toast(`Camera ${!isCameraOff ? 'turned off' : 'turned on'}`);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !session?.user) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      sender: {
        name: session.user?.name ?? 'Anonymous',
        avatar: session.user?.image ?? undefined,
      },
      timestamp: new Date(),
    };

    socket.emit('chat-message', {
      streamId: id,
      message,
    });

    // Add message locally to avoid delay
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  // Function to toggle fullscreen
  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => {
        toast.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Show stream quality information for the host
  const getQualityLabel = () => {
    if (!streamMetrics) return 'Unknown';
    
    const { video, connection } = streamMetrics;
    
    // Determine quality label based on bitrate and resolution
    if (video.bitrate > 2000 && video.resolution.height >= 720) {
      return 'HD Quality';
    } else if (video.bitrate > 1000 && video.resolution.height >= 480) {
      return 'Good Quality';
    } else if (video.bitrate > 500) {
      return 'Standard Quality';
    } else {
      return 'Low Quality';
    }
  };
  
  // Optimize bandwidth for mobile
  const [isLowBandwidth, setIsLowBandwidth] = useState(false);
  
  const toggleBandwidthMode = () => {
    setIsLowBandwidth(!isLowBandwidth);
    if (webrtcRef.current) {
      // Apply new quality constraints
      try {
        const videoTrack = webrtcRef.current.getLocalStream()?.getVideoTracks()[0];
        if (videoTrack) {
          // Apply low or medium quality
          const constraints: MediaTrackConstraints = {
            width: { ideal: isLowBandwidth ? 640 : 320 },
            height: { ideal: isLowBandwidth ? 480 : 240 },
            frameRate: { ideal: isLowBandwidth ? 24 : 15 }
          };
          
          videoTrack.applyConstraints(constraints)
            .then(() => {
              toast.success(`Switched to ${isLowBandwidth ? 'normal' : 'low bandwidth'} mode`);
            })
            .catch(error => {
              console.error('Error applying constraints:', error);
              toast.error('Failed to change bandwidth mode');
            });
        }
      } catch (error) {
        console.error('Error changing bandwidth mode:', error);
      }
    }
  };

  // Handle stream initialization
  const handleStreamReady = (stream: MediaStream) => {
    try {
      console.log('Stream ready callback triggered with tracks:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      
      if (!stream) {
        console.error('Received null or undefined stream in handleStreamReady');
        toast.error('Failed to initialize video stream. Please refresh and try again.');
        return;
      }
      
      // Check if the stream has tracks
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      console.log(`Stream has ${videoTracks.length} video track(s) and ${audioTracks.length} audio track(s)`);
      
      if (videoTracks.length === 0 && audioTracks.length === 0) {
        console.warn('Stream has no tracks');
        toast.error('No camera or microphone detected in the stream');
      } else if (videoTracks.length === 0) {
        console.warn('Stream has no video tracks, audio only');
        toast('Audio-only stream (no camera detected)', { icon: '🔈' });
      }
      
      // First update our state so the effect will run
      setLocalStream(stream);
      streamStartedRef.current = true;
      
      // Apply stream to video element directly as an immediate fix - with extra safety checks
      const videoElement = videoRef.current;
      
      if (!videoElement) {
        console.log('Video element not yet available in handleStreamReady, relying on useEffect to handle it later');
        // Don't report this as an error since the useEffect will handle it when videoRef is available
        // The stream is already stored in state, so it will be applied when the video element mounts
        return;
      }
      
      try {
        console.log('Directly setting video element srcObject to ensure immediate display');
        videoElement.srcObject = stream;
        
        // Try to play the video right away
        videoElement.play().catch(err => {
          console.warn('Video play in handleStreamReady failed:', err);
          
          // If autoplay is blocked, show a message
          if (err.name === 'NotAllowedError') {
            toast('Click the video player to start the stream', {
              icon: '👆',
              duration: 4000
            });
            
            // Add a click handler to start playing when user interacts
            const handleVideoClick = () => {
              videoElement.play().catch(playErr => 
                console.error('Play after click failed:', playErr)
              );
              // Remove the click handler after it's used
              videoElement.removeEventListener('click', handleVideoClick);
            };
            
            videoElement.addEventListener('click', handleVideoClick);
          }
        });
      } catch (err) {
        console.error('Error setting video srcObject in handleStreamReady:', err);
        
        // Fallback for older browsers
        try {
          // TypeScript doesn't recognize this legacy approach, but it works in older browsers
          // @ts-ignore - URL.createObjectURL accepts MediaStream in older browsers
          videoElement.src = URL.createObjectURL(stream);
        } catch (fallbackErr) {
          console.error('Fallback to createObjectURL also failed:', fallbackErr);
        }
      }
      
      // If we're on iOS, we need to play the video on first user interaction
      const isIOS = /iPad|iPhone|iPod/.test(navigator?.userAgent || '');
      if (isIOS) {
        toast('Tap on the video to start playback on iOS', {
          icon: '📱',
          duration: 4000
        });
      }
    } catch (err) {
      console.error('Error in handleStreamReady:', err);
      toast.error('Error initializing stream');
    }
  };

  // Update viewer count
  const handleViewerCount = (count: number) => {
    setParticipantCount(count);
  };

  // Toggle live status for host
  const handleToggleLive = async () => {
    if (!stream) return;
    
    try {
      console.log('handleToggleLive called, checking camera access...');
      
      // Add loading state to prevent multiple clicks
      const isStartingStream = !stream.isLive;
      
      // If we're starting a stream but don't have camera access yet, request it first
      if (isStartingStream && !localStream) {
        console.log('No local stream available, requesting camera access first');
        toast('Requesting camera access...');
        
        // Starting the stream - first get camera access directly
        try {
          console.log('Starting stream - requesting camera and mic access');
          
          // Firefox specific handling
          const isFirefox = navigator?.userAgent?.toLowerCase()?.includes('firefox');
          
          // Create combined stream container for Firefox
          let combinedStream: MediaStream | null = null;
          let videoObtained = false;
          let audioObtained = false;
          
          if (isFirefox) {
            console.log('Firefox detected, using special acquisition pattern');
            combinedStream = new MediaStream();
            
            // Try video first for Firefox (more reliable)
            try {
              console.log('Firefox: Getting video-only first');
              const videoStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: false 
              });
              
              if (videoStream && videoStream.getVideoTracks().length > 0) {
                videoStream.getVideoTracks().forEach(track => {
                  if (combinedStream) combinedStream.addTrack(track);
                });
                videoObtained = true;
                console.log('Video stream obtained successfully for Firefox');
                
                // Set this video-only stream while we wait for audio attempt
                if (combinedStream && videoObtained) {
                  setLocalStream(combinedStream);
                  
                  if (videoRef.current) {
                    videoRef.current.srcObject = combinedStream;
                    
                    // Try to play immediately
                    try {
                      await videoRef.current.play();
                    } catch (playErr) {
                      console.warn('Could not autoplay video:', playErr);
                    }
                  }
                }
              }
            } catch (videoErr) {
              console.error('Error getting video stream in Firefox:', videoErr);
            }
            
            // Small delay before audio attempt
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try audio separately
            try {
              console.log('Firefox: Now getting audio-only');
              const audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true
                }, 
                video: false 
              });
              
              if (audioStream && audioStream.getAudioTracks().length > 0) {
                audioStream.getAudioTracks().forEach(track => {
                  if (combinedStream) combinedStream.addTrack(track);
                });
                audioObtained = true;
                console.log('Audio stream obtained successfully for Firefox');
              }
            } catch (audioErr) {
              console.error('Error getting audio stream in Firefox:', audioErr);
              
              // Try once more with simplest constraints
              try {
                console.log('Firefox: Trying one more time with basic audio');
                const basicAudioStream = await navigator.mediaDevices.getUserMedia({ 
                  audio: true, 
                  video: false 
                });
                
                if (basicAudioStream && basicAudioStream.getAudioTracks().length > 0) {
                  basicAudioStream.getAudioTracks().forEach(track => {
                    if (combinedStream) combinedStream.addTrack(track);
                  });
                  audioObtained = true;
                  console.log('Basic audio stream obtained successfully for Firefox');
                }
              } catch (finalAudioErr) {
                console.error('All Firefox audio attempts failed:', finalAudioErr);
              }
            }
            
            // Did we get anything at all?
            if (combinedStream && (videoObtained || audioObtained)) {
              console.log(`Firefox final stream - Video: ${videoObtained}, Audio: ${audioObtained}`);
              
              // Set the final stream
              setLocalStream(combinedStream);
              streamStartedRef.current = true;
              
              // Update video element
              if (videoRef.current) {
                videoRef.current.srcObject = combinedStream;
                videoRef.current.muted = true; // Mute to prevent feedback
                
                try {
                  await videoRef.current.play();
                  console.log('Video playing successfully in Firefox');
                } catch (playErr) {
                  console.warn('Could not play video in Firefox:', playErr);
                }
              }
            } else {
              throw new Error('Could not get any media in Firefox');
            }
          } else {
            // Standard approach for other browsers
            try {
              const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
              });
              
              console.log('Camera and microphone access granted for stream start', mediaStream);
              
              // Set the stream directly
              setLocalStream(mediaStream);
              streamStartedRef.current = true;
              
              if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.muted = true; // Always mute our own audio to prevent feedback
                
                // Try to play immediately
                try {
                  await videoRef.current.play();
                  console.log('Video playback started successfully');
                } catch (playErr) {
                  console.warn('Could not autoplay video:', playErr);
                }
              }
            } catch (mediaErr) {
              console.error('Error accessing main camera and mic:', mediaErr);
              
              // Try just video as fallback
              try {
                console.log('Attempting video-only fallback');
                const videoOnlyStream = await navigator.mediaDevices.getUserMedia({ 
                  video: true, 
                  audio: false 
                });
                
                setLocalStream(videoOnlyStream);
                streamStartedRef.current = true;
                
                if (videoRef.current) {
                  videoRef.current.srcObject = videoOnlyStream;
                  
                  try {
                    await videoRef.current.play();
                  } catch (playErr) {
                    console.warn('Could not autoplay video:', playErr);
                  }
                }
                
                toast('Audio access failed. Using video only.', { icon: '🎥' });
              } catch (videoErr) {
                console.error('Video-only fallback also failed:', videoErr);
                toast.error('Could not access camera or microphone. Please check your permissions.');
                setStreamError('Media access denied. Please check your browser permissions.');
                setIsStreaming(false);
                return;
              }
            }
          }
          
          // If we get here, we have at least some kind of stream (video or audio or both)
          
          // Initialize WebRTC if needed, but continue even if it fails
          let webRTCInitialized = false;
          
          try {
            if (!webrtcRef.current) {
              webrtcRef.current = new WebRTCService({
                onConnectionStateChange: setConnectionState,
                onIceConnectionStateChange: setIceConnectionState,
                onError: handleWebRTCError,
                onMetricsUpdate: setStreamMetrics,
              });
            }
            
            // Use this stream for WebRTC
            // For Firefox, this will be the combined stream if we got one
            const streamToUse = isFirefox ? combinedStream : localStream;
            
            if (streamToUse) {
              await webrtcRef.current.setLocalStream(streamToUse);
              console.log('WebRTC service initialized with stream');
              webRTCInitialized = true;
            }
          } catch (webrtcErr) {
            console.error('Error initializing WebRTC:', webrtcErr);
          }
          
          // Set UI state
          setIsStreaming(true);
          setStreamError(null);
          streamStartedRef.current = true;
          
          // Try to update the database, but proceed even if it fails
          try {
            const response = await fetch(`/api/streams/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...stream,
                isLive: true,
              }),
            });
            
            if (!response.ok) {
              throw new Error('Failed to update stream status in database');
            }
            
            const updatedData = await response.json();
            setStream(updatedData.stream);
            
            const messageText = isFirefox ? 
              `Stream is now live${!audioObtained ? ' (video only - no audio)' : ''}!` : 
              'Stream is now live!';
            
            toast.success(messageText);
          } catch (dbErr) {
            console.error('Error updating database, but local stream is working:', dbErr);
            toast.error('Could not update stream status in database, but local camera is working');
          }
          
        } catch (err) {
          console.error('Failed to get local stream:', err);
          toast.error('Could not access camera or microphone. Please check your permissions.');
          setStreamError('Media access denied. Please check your browser permissions.');
          setIsStreaming(false);
          return;
        }
      } else if (isStartingStream) {
        // We already have a localStream, just start streaming
        console.log('Using existing localStream to go live');
        setIsStreaming(true);
        setStreamError(null);
        
        // Update the database
        try {
          const response = await fetch(`/api/streams/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...stream,
              isLive: true,
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to update stream status in database');
          }
          
          const updatedData = await response.json();
          setStream(updatedData.stream);
          toast.success('Stream is now live!');
        } catch (dbErr) {
          console.error('Error updating database:', dbErr);
          toast.error('Could not update stream status in database');
        }
      } else {
        // Stopping stream
        console.log('Stopping stream');
        setIsStreaming(false);
        
        // Update the database
        try {
          const response = await fetch(`/api/streams/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...stream,
              isLive: false,
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to update stream status in database');
          }
          
          const updatedData = await response.json();
          setStream(updatedData.stream);
          toast.success('Stream ended');
        } catch (dbErr) {
          console.error('Error updating database:', dbErr);
          toast.error('Could not update stream status in database');
        }
      }
    } catch (err) {
      console.error('Error toggling live status:', err);
      toast.error('Failed to update stream status');
      // Reset streaming state if failed
      setIsStreaming(false);
    }
  };

  // Function to toggle video size
  const toggleVideoSize = () => {
    setVideoSize(prevSize => prevSize === 'normal' ? 'medium' : 'normal');
    
    // Wait for layout adjustment
    setTimeout(() => {
      if (videoContainerRef.current) {
        try {
          scrollToVideoContainer();
        } catch (err) {
          console.error('Error scrolling to video container:', err);
        }
      }
    }, 100);
  };
  
  const scrollToVideoContainer = () => {
    if (videoContainerRef.current) {
      videoContainerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // Handle escape key to exit medium mode
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && videoSize === 'medium') {
        toggleVideoSize();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [videoSize]);

  // Handle chat visibility toggle
  const toggleChatVisibility = () => {
    setIsChatVisible(!isChatVisible);
  };

  // New functions for YouTube-like features
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      content: newComment,
      user: {
        name: session?.user?.name || 'Anonymous',
        avatar: session?.user?.image || undefined,
      },
      timestamp: new Date(),
      likes: 0,
      replies: []
    };
    
    setComments(prev => [comment, ...prev]);
    setNewComment('');
  };

  const handleLikeComment = (commentId: string) => {
    setComments(prev => prev.map(comment => 
      comment.id === commentId ? { ...comment, likes: comment.likes + 1 } : comment
    ));
  };

  // Effect to clean up all media streams when component unmounts
  useEffect(() => {
    return () => {
      console.log('Component unmounting, ensuring all media resources are released');
      
      // Call our improved stopStream function for thorough cleanup
      if (localStream || webrtcRef.current) {
        stopStream();
      }
      
      // Additional cleanup to ensure camera light turns off
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        try {
          // This trick helps ensure the camera light turns off on some browsers
          // Create a temporary stream and immediately stop it
          navigator.mediaDevices.getUserMedia({ audio: true, video: true })
            .then(tempStream => {
              tempStream.getTracks().forEach(track => {
                track.stop();
              });
              console.log('Additional camera/mic release completed');
            })
            .catch(err => {
              // This is expected if permissions aren't granted again
              console.log('Additional release attempt failed (expected):', err.name);
            });
        } catch (err) {
          console.error('Error in final cleanup attempt:', err);
        }
      }
    };
  }, []);

  // Effect to ensure stream initializer is ready when deps are available
  useEffect(() => {
    // This effect handles the case where we need to wait for the DOM to be ready
    // before we can initialize the stream
    if (isHost && !isStreaming && !localStream && !videoRef.current) {
      console.log('Video element not yet available, waiting before initializing stream...');
    }
  }, [isHost, isStreaming, localStream, videoRef.current]);

  // Add new effect to automatically request camera permissions for host
  useEffect(() => {
    // Automatically set streamStartedRef.current to true for hosts
    // This will trigger the StreamInitializer to render and request permissions
    if (isHost && !isStreaming && !localStream && isMounted) {
      console.log('Host detected, automatically setting up camera permissions');
      // Set a small delay to ensure the UI is fully rendered
      const timer = setTimeout(() => {
        streamStartedRef.current = true;
        // Force a re-render
        setPermissionStatus(prev => ({...prev}));
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isHost, isStreaming, localStream, isMounted]);

  // Request permissions manually if needed
  const requestMediaPermissions = async () => {
    try {
      console.log('Requesting camera permissions manually...');
      
      // Ensure the streamStartedRef is set to true immediately
      streamStartedRef.current = true;
      
      // Request camera and microphone directly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      console.log('Successfully obtained camera and microphone access', stream);
      toast.success("Camera and microphone access granted!");
      
      // Use this stream directly
      setLocalStream(stream);
      
      // Display in video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute to prevent feedback
        
        try {
          await videoRef.current.play();
        } catch (err) {
          console.warn('Could not autoplay video after granting permission:', err);
        }
      }
      
      return true;
    } catch (err) {
      console.error("Error requesting permissions:", err);
      toast.error("Could not access camera. Please check your browser permissions.");
      return false;
    }
  };

  // Add background blur toggle function
  const toggleBackgroundBlur = () => {
    setIsBackgroundBlurred(!isBackgroundBlurred);
  };

  // Wait for client-side mounting before rendering UI components
  if (!isMounted) {
    return <div className="flex items-center justify-center h-[70vh]">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
        <p className="text-gray-300">Loading stream...</p>
      </div>
    </div>;
  }

  // Authentication loading state
  if (status === 'loading') {
    return <div className="flex items-center justify-center h-[70vh]">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
        <p className="text-gray-300">Checking authorization...</p>
      </div>
    </div>;
  }

  // Stream loading state
  if (loading) {
    return <div className="flex items-center justify-center h-[70vh]">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
        <p className="text-gray-300">Loading stream...</p>
      </div>
    </div>;
  }

  // Error state
  if (error || streamError) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="bg-gradient-to-b from-gray-800/60 to-gray-900/70 rounded-2xl p-8 text-center backdrop-blur-sm border border-gray-700 shadow-xl shadow-black/10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-900/30 flex items-center justify-center">
            <GlassWater size={36} className="text-red-500" />
          </div>
          <h3 className="text-2xl font-semibold text-white mb-3">Stream Error</h3>
          <p className="text-gray-300 mb-6 max-w-md mx-auto">{error || streamError || "Something went wrong with the stream"}</p>
          <button
            onClick={() => router.push('/streams')}
            className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-3 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all shadow-lg shadow-amber-900/20"
          >
            Back to Streams
          </button>
        </div>
      </div>
    );
  }

  // Stream not found state
  if (!stream) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-8 max-w-md mx-auto">
          <p className="text-gray-300 text-lg mb-4">Stream not found or no longer available</p>
          <button
            onClick={() => router.push('/streams')}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Back to Streams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Main content container */}
      <div className="container mx-auto px-4 py-20 max-w-screen-2xl"> {/* Added py-20 to account for header height */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Main content area - Video and info */}
          <div className="flex-1">
            {/* Video Player section */}
            <div 
              ref={videoContainerRef}
              className={`relative bg-black rounded-lg overflow-hidden mb-4 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
            >
              {/* Video element */}
              <div className="relative pb-[56.25%]"> {/* 16:9 aspect ratio */}
                <div className={`absolute inset-0 ${isBackgroundBlurred ? 'backdrop-blur-md' : ''}`}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    controls={!isHost && isStreaming}
                    className="absolute top-0 left-0 w-full h-full object-cover bg-black"
                  />
                </div>

                {/* Video controls overlay */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
                  <div className="flex items-center gap-2">
                    {/* Fullscreen toggle */}
                    <button
                      onClick={toggleFullscreen}
                      className="bg-black/60 p-2 rounded-lg hover:bg-black/80 transition-colors text-white"
                      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                      {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>

                    {/* Background blur toggle */}
                    <button
                      onClick={toggleBackgroundBlur}
                      className={`bg-black/60 p-2 rounded-lg hover:bg-black/80 transition-colors ${
                        isBackgroundBlurred ? 'text-amber-500' : 'text-white'
                      }`}
                      title={isBackgroundBlurred ? 'Disable background blur' : 'Enable background blur'}
                    >
                      <Droplets size={18} />
                    </button>
                  </div>

                  {/* Stream metrics */}
                  {(isHost || streamMetrics || webSocketError) && (
                    <div className="bg-black/60 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
                      {webSocketError && (
                        <div className="bg-yellow-600/80 text-white px-2 py-0.5 rounded-sm flex items-center gap-1 mr-2">
                          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                          <span>Local Preview</span>
                        </div>
                      )}
                      <Users size={14} className="text-gray-300" />
                      <span>{participantCount} watching</span>
                      {streamMetrics && (
                        <>
                          <span className="mx-1 text-gray-500">|</span>
                          <Activity size={14} className="text-gray-300" />
                          <span>{getQualityLabel()}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Overlay controls for host */}
                {isHost && (
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                    <div className="flex gap-2">
                      {/* Permission status indicator */}
                      {!isStreaming && !localStream && (
                        <div className="bg-yellow-600/70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1 mr-2">
                          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                          <span>Camera access needed</span>
                        </div>
                      )}
                      {localStream && (
                        <div className="bg-green-600/70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1 mr-2">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          <span>Camera ready</span>
                        </div>
                      )}
                      <button
                        onClick={toggleMute}
                        className={`p-2 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-800/80'}`}
                      >
                        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
                      <button
                        onClick={toggleCamera}
                        className={`p-2 rounded-full ${isCameraOff ? 'bg-red-600' : 'bg-gray-800/80'}`}
                      >
                        {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      {isHost && !isStreaming && !localStream && (
                        <button
                          onClick={() => {
                            streamStartedRef.current = true;
                            requestMediaPermissions();
                          }}
                          className="px-4 py-2 rounded-full font-medium bg-amber-600 hover:bg-amber-700 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Video size={16} />
                            <span>Enable Camera</span>
                          </div>
                        </button>
                      )}
                      <button
                        onClick={handleToggleLive}
                        disabled={!isHost}
                        className={`px-4 py-2 rounded-full font-medium ${
                          isStreaming 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : isHost ? 'bg-green-600 hover:bg-green-700 cursor-pointer' 
                            : 'bg-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {isStreaming ? 'End Stream' : 'Go Live'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Video info section */}
            <div className="mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-2">{stream.title}</h1>
              
              <div className="flex flex-wrap justify-between items-center py-4 border-b border-gray-700">
                <div className="flex items-center gap-3 mb-3 md:mb-0">
                  <div className="w-10 h-10 relative rounded-full overflow-hidden bg-amber-600">
                    {stream?.host?.avatar ? (
                      <Image
                        src={stream.host.avatar}
                        alt={stream.host?.name || 'Host'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-medium">
                        {stream.host?.name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-white">{stream.host?.name || 'Host'}</h3>
                    <p className="text-gray-400 text-sm">{participantCount} {participantCount === 1 ? 'subscriber' : 'subscribers'}</p>
                  </div>
                </div>
                
                {/* Add StreamInteractions component */}
                <StreamInteractions
                  streamId={stream.id}
                  hostId={stream.hostId}
                />
              </div>
              
              {/* Description & spirit info */}
              <div className="bg-gray-800 rounded-lg p-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock size={16} />
                    <span>Streamed on {stream?.startedAt ? new Date(stream.startedAt).toLocaleDateString() : 'unknown date'} 
                    {stream?.isLive && <span className="ml-2 text-green-500 font-medium">• LIVE NOW</span>}</span>
                  </div>
                  <button
                    onClick={() => setIsDescriptionCollapsed(!isDescriptionCollapsed)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {isDescriptionCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  </button>
                </div>
                
                <div className={`overflow-hidden transition-all duration-300 ${isDescriptionCollapsed ? 'max-h-0' : 'max-h-[1000px]'}`}>
                  {stream.description && (
                    <p className="text-gray-300 mt-2">{stream.description}</p>
                  )}
                  
                  {stream?.spirit && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <h4 className="text-amber-400 font-medium mb-2 flex items-center gap-2">
                        <Award size={16} />
                        <span>Featured Spirit</span>
                      </h4>
                      <p className="text-white font-medium">{stream.spirit.name}</p>
                      <p className="text-gray-300">{stream.spirit.brand} • {stream.spirit.type}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Comments section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Comments</h3>
                <span className="text-sm text-gray-400">{comments.length} comments</span>
              </div>

              {session ? (
                <form onSubmit={handleCommentSubmit} className="mb-6">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-500">
                      {session.user?.name?.[0].toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Comment
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mb-6 p-4 bg-gray-800 rounded-lg text-center">
                  <p className="text-gray-300 mb-2">Sign in to leave a comment</p>
                  <Link
                    href="/api/auth/signin"
                    className="text-amber-500 hover:text-amber-400 font-medium"
                  >
                    Sign In
                  </Link>
                </div>
              )}

              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-500">
                      {comment.user.name?.[0].toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{comment.user.name}</span>
                        <span className="text-gray-400 text-sm">
                          {new Date(comment.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-300">{comment.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <button
                          onClick={() => handleLikeComment(comment.id)}
                          className="text-gray-400 hover:text-amber-500 transition-colors text-sm flex items-center gap-1"
                        >
                          <ThumbsUp size={14} />
                          <span>{comment.likes}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {comments.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare size={32} className="text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">No comments yet</p>
                    <p className="text-gray-500 text-sm">Be the first to share your thoughts!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Chat sidebar */}
          {isChatVisible && (
            <div 
              className={`lg:w-96 w-full lg:sticky lg:top-24 bg-gray-800 rounded-lg overflow-hidden border border-gray-700 flex flex-col transition-all duration-300 ease-in-out ${
                isChatCollapsed ? 'h-[48px]' : 'h-[calc(100vh-160px)]'
              }`}
            >
              {stream.isLive ? (
                <ChatBox 
                  streamId={id} 
                  isHost={isHost} 
                  userName={session?.user?.name || 'Anonymous'} 
                  socket={socket}
                  isCollapsed={isChatCollapsed}
                  onToggleCollapse={() => setIsChatCollapsed(!isChatCollapsed)}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <MessageSquare size={32} className="text-gray-500 mb-4" />
                  <h3 className="text-white font-medium mb-2">Chat is only available during live streams</h3>
                  <p className="text-gray-400 text-sm">This stream is currently offline.</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Chat toggle button (mobile only) */}
        <button
          onClick={toggleChatVisibility}
          className="fixed bottom-6 right-6 z-10 lg:hidden bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-full shadow-lg"
        >
          {isChatVisible ? <ChevronRight size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>
      
      {/* 
         Stream initializer component for host setup
         ==========================================
         IMPORTANT: We always render this component for hosts to ensure camera permissions are requested
         as soon as the page loads, not only when clicking buttons.
      */}
      {isHost && !isStreaming && !localStream && (
        <StreamInitializer
          streamId={id}
          isHost={isHost}
          onStreamReady={handleStreamReady}
          onViewerCount={handleViewerCount}
        />
      )}
    </div>
  );
} 