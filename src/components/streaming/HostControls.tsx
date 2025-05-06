'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Camera, CameraOff, Monitor, Settings, Users, BarChart2, X, Plus, Trash2 } from 'lucide-react';
import Button from "@/components/ui/Button"
import { toast } from 'react-hot-toast';

interface PollOption {
  id: string;
  text: string;
}

interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  duration: number; // in seconds
}

interface HostControlsProps {
  localStream: MediaStream | null;
  isLive: boolean;
  viewerCount: number;
  onToggleLive: () => void;
  socket?: any; // Socket instance
  streamId?: string;
}

export default function HostControls({
  localStream,
  isLive,
  viewerCount,
  onToggleLive,
  socket,
  streamId,
}: HostControlsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStartingStream, setIsStartingStream] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);
  const [pollDuration, setPollDuration] = useState(60); // Default 60 seconds
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<{
    camera: 'granted' | 'denied' | 'prompt' | 'unknown';
    microphone: 'granted' | 'denied' | 'prompt' | 'unknown';
  }>({
    camera: 'unknown',
    microphone: 'unknown'
  });
  
  // Reset starting state when stream goes live
  useEffect(() => {
    if (isLive) {
      setIsStartingStream(false);
    }
  }, [isLive]);

  // Effect to listen for host token
  useEffect(() => {
    if (!socket) return;

    const handleJoinedStream = (data: any) => {
      console.log('Received joined-stream event:', data);
      if (data.hostToken) {
        console.log('Received host token:', data.hostToken);
        setHostToken(data.hostToken);
      }
    };

    socket.on('joined-stream', handleJoinedStream);

    // Request to join stream to get a host token
    if (isLive && streamId) {
      console.log('Requesting to join stream as host to get host token');
      socket.emit('join-stream', {
        streamId,
        userName: 'Host',
        isHost: true
      });
    }

    return () => {
      socket.off('joined-stream', handleJoinedStream);
    };
  }, [socket, isLive, streamId]);

  // Check permission status on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // More robust media devices check
        const detectMediaSupport = () => {
          try {
            // First check if we have a window object (for SSR)
            if (typeof window === 'undefined') return false;
            
            // Then check for navigator object
            if (!navigator) return false;
            
            // Safari needs special handling
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            
            if (isSafari) {
              return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
            }
            
            return !!(navigator.mediaDevices && 
                     typeof navigator.mediaDevices.getUserMedia === 'function');
          } catch (e) {
            return false;
          }
        };
        
        // Check if mediaDevices is supported at all
        if (!detectMediaSupport()) {
          console.warn('MediaDevices API not supported in this browser');
          setPermissionStatus({
            camera: 'denied',
            microphone: 'denied'
          });
          
          toast.error('Your browser does not support camera and microphone access. Please try Chrome, Firefox, or Safari.');
          return;
        }
        
        // Check for existing permissions
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const cameraStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
            const micStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            
            setPermissionStatus({
              camera: cameraStatus.state as any,
              microphone: micStatus.state as any
            });
            
            // Add event listeners for permission changes
            cameraStatus.addEventListener('change', () => {
              setPermissionStatus(prev => ({ ...prev, camera: cameraStatus.state as any }));
            });
            
            micStatus.addEventListener('change', () => {
              setPermissionStatus(prev => ({ ...prev, microphone: micStatus.state as any }));
            });
          } catch (err) {
            console.error('Error querying permissions:', err);
            // Fall back to checking device availability
            checkDevicesAvailability();
          }
        } else {
          // Permissions API not available, fall back to checking device availability
          console.log('Permissions API not available, falling back to device enumeration');
          checkDevicesAvailability();
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    };
    
    // Alternative method to check permissions when Permissions API is not available
    const checkDevicesAvailability = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const hasCamera = devices.some(device => device.kind === 'videoinput');
        const hasMic = devices.some(device => device.kind === 'audioinput');
        
        console.log('Devices found:', {
          camera: hasCamera ? 'available' : 'not found',
          microphone: hasMic ? 'available' : 'not found'
        });
        
        // We don't know if they're granted, just that they exist
        setPermissionStatus({
          camera: hasCamera ? 'prompt' : 'denied',
          microphone: hasMic ? 'prompt' : 'denied'
        });
      } catch (err) {
        console.error('Error enumerating devices:', err);
        // Assume denied if we can't even check
        setPermissionStatus({
          camera: 'denied',
          microphone: 'denied'
        });
      }
    };
    
    checkPermissions();
  }, []);

  // Effect for toggling mute
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  // Effect for toggling video
  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoEnabled;
      });
    }
  }, [isVideoEnabled, localStream]);

  const handleToggleMute = () => {
    // If permission is denied, request it again
    if (permissionStatus.microphone === 'denied') {
      requestMicrophonePermission();
      return;
    }
    
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    // If permission is denied, request it again
    if (permissionStatus.camera === 'denied') {
      requestCameraPermission();
      return;
    }
    
    setIsVideoEnabled(!isVideoEnabled);
  };
  
  // Create a utility function to safely check for mediaDevices support
  const hasMediaDevicesSupport = () => {
    return !!(
      typeof window !== 'undefined' && 
      navigator && 
      ((navigator as any).mediaDevices && 
      (navigator as any).mediaDevices.getUserMedia) || 
      (navigator as any).webkitGetUserMedia || 
      (navigator as any).mozGetUserMedia
    );
  };
  
  const requestCameraPermission = async () => {
    try {
      // Check if mediaDevices is supported
      if (!hasMediaDevicesSupport()) {
        console.warn('MediaDevices API not supported in this browser');
        setPermissionStatus(prev => ({ ...prev, camera: 'denied' }));
        toast.error('Camera not supported in this browser. Try Chrome, Firefox, or Safari.');
        
        // For development, we can show an error but allow the app to continue
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: proceeding despite camera API not being available');
          setPermissionStatus(prev => ({ ...prev, camera: 'prompt' }));
          setIsVideoEnabled(false);
          return;
        }
        return;
      }
      
      // Check for secure context
      if (window.isSecureContext === false) {
        console.warn('Not in a secure context, camera access may be denied');
        toast.error('Camera access requires HTTPS or localhost.');
      }
      
      // This will trigger browser permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('Camera permission granted');
      
      // Cleanup this temporary stream
      stream.getTracks().forEach(track => track.stop());
      
      // Update status
      setPermissionStatus(prev => ({ ...prev, camera: 'granted' }));
      setIsVideoEnabled(true);
      toast.success('Camera access granted');
    } catch (error: any) {
      console.error('Error requesting camera permission:', error);
      const errorName = error?.name || 'Unknown';
      const errorMessage = error?.message || 'Camera access failed';
      
      console.error(`Camera error: ${errorName} - ${errorMessage}`);
      
      // Special handling for common errors
      if (errorName === 'NotAllowedError') {
        toast.error('Camera access was denied. Please check your browser permissions.');
      } else if (errorName === 'NotFoundError') {
        toast.error('No camera device found. Please check your hardware connection.');
      } else if (errorName === 'NotReadableError') {
        toast.error('Camera may be in use by another application.');
      } else {
        toast.error(`Camera access denied: ${errorName}`);
      }
      
      setPermissionStatus(prev => ({ ...prev, camera: 'denied' }));
    }
  };
  
  const requestMicrophonePermission = async () => {
    try {
      // Check if mediaDevices is supported
      if (!hasMediaDevicesSupport()) {
        console.warn('MediaDevices API not supported in this browser');
        setPermissionStatus(prev => ({ ...prev, microphone: 'denied' }));
        toast.error('Microphone not supported in this browser. Try Chrome, Firefox, or Safari.');
        
        // For development, we can show an error but allow the app to continue
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: proceeding despite microphone API not being available');
          setPermissionStatus(prev => ({ ...prev, microphone: 'prompt' }));
          setIsMuted(true);
          return;
        }
        return;
      }
      
      // Check for secure context
      if (window.isSecureContext === false) {
        console.warn('Not in a secure context, microphone access may be denied');
        toast.error('Microphone access requires HTTPS or localhost.');
      }
      
      // This will trigger browser permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone permission granted');
      
      // Cleanup this temporary stream
      stream.getTracks().forEach(track => track.stop());
      
      // Update status
      setPermissionStatus(prev => ({ ...prev, microphone: 'granted' }));
      setIsMuted(false);
      toast.success('Microphone access granted');
    } catch (error: any) {
      console.error('Error requesting microphone permission:', error);
      const errorName = error?.name || 'Unknown';
      const errorMessage = error?.message || 'Microphone access failed';
      
      console.error(`Microphone error: ${errorName} - ${errorMessage}`);
      
      // Special handling for common errors
      if (errorName === 'NotAllowedError') {
        toast.error('Microphone access was denied. Please check your browser permissions.');
      } else if (errorName === 'NotFoundError') {
        toast.error('No microphone device found. Please check your hardware connection.');
      } else if (errorName === 'NotReadableError') {
        toast.error('Microphone may be in use by another application.');
      } else {
        toast.error(`Microphone access denied: ${errorName}`);
      }
      
      setPermissionStatus(prev => ({ ...prev, microphone: 'denied' }));
    }
  };

  // Ensure camera/mic are stopped when ending the stream
  const handleToggleLive = () => {
    // Prevent button spam when starting the stream
    if (!isLive && isStartingStream) {
      console.log('Already attempting to start stream, ignoring click');
      return;
    }

    if (isLive) {
      // Before turning off, make sure user wants to end the stream
      if (window.confirm('Are you sure you want to end this stream? This will turn off your camera and microphone.')) {
        // Explicitly stop local tracks before calling onToggleLive
        if (localStream) {
          console.log('HostControls: Stopping local stream tracks before ending stream');
          
          // First disable all tracks
          localStream.getTracks().forEach(track => {
            console.log(`HostControls: Disabling track: ${track.kind}`, track);
            try {
              track.enabled = false;
            } catch (err) {
              console.error('Error disabling track:', err);
            }
          });
          
          // Then stop all tracks
          localStream.getTracks().forEach(track => {
            console.log(`HostControls: Stopping track: ${track.kind}`, track);
            try {
              track.stop();
            } catch (err) {
              console.error('Error stopping track:', err);
            }
          });
          
          // Ensure browser knows we're done with the devices
          try {
            // For some browsers, creating and immediately stopping a new stream
            // can help release device permissions fully
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
              .then(tempStream => {
                console.log('Created temporary stream to help release hardware');
                tempStream.getTracks().forEach(track => {
                  console.log(`Stopping temporary ${track.kind} track`);
                  track.stop();
                });
              })
              .catch(err => {
                // This is normal if permissions were already fully revoked
                console.log('Could not create temporary stream (probably already released):', err);
              });
          } catch (e) {
            console.error('Error during hardware release attempt:', e);
          }
        }
        
        // Now call the provided callback to handle any additional cleanup
        onToggleLive();
      }
    } else {
      // Set starting state to prevent multiple clicks
      setIsStartingStream(true);
      
      // Request camera/microphone permissions immediately to improve first-click experience
      if (permissionStatus.camera !== 'granted' || permissionStatus.microphone !== 'granted') {
        // Ask for both permissions at once
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(tempStream => {
            console.log('Successfully got camera and mic permissions');
            // Stop the temporary stream - the actual streaming code will get its own stream
            tempStream.getTracks().forEach(track => track.stop());
            
            // Update permission status
            setPermissionStatus({
              camera: 'granted',
              microphone: 'granted'
            });
            
            // Continue with starting the stream
            onToggleLive();
          })
          .catch(err => {
            console.error('Error requesting permissions:', err);
            // Reset starting state if permission denied
            setIsStartingStream(false);
            
            // Still try to continue anyway
            onToggleLive();
          });
      } else {
        // Already have permissions, just start the stream
        onToggleLive();
      }
      
      // Set a timeout to reset the starting state in case something goes wrong
      setTimeout(() => {
        if (!isLive) {
          setIsStartingStream(false);
        }
      }, 10000); // 10 second timeout
    }
  };

  // Poll handlers
  const handleAddPollOption = () => {
    if (pollOptions.length >= 6) {
      toast.error('Maximum 6 options allowed');
      return;
    }
    
    setPollOptions([
      ...pollOptions,
      { id: Date.now().toString(), text: '' }
    ]);
  };

  const handleRemovePollOption = (id: string) => {
    if (pollOptions.length <= 2) {
      toast.error('Minimum 2 options required');
      return;
    }
    
    setPollOptions(pollOptions.filter(option => option.id !== id));
  };

  const handlePollOptionChange = (id: string, text: string) => {
    setPollOptions(
      pollOptions.map(option => 
        option.id === id ? { ...option, text } : option
      )
    );
  };

  const handleCreatePoll = () => {
    // Validate poll data
    if (!pollQuestion.trim()) {
      toast.error('Please enter a question');
      return;
    }

    const validOptions = pollOptions.filter(option => option.text.trim());
    if (validOptions.length < 2) {
      toast.error('Please add at least 2 options');
      return;
    }

    // Create poll object
    const poll: PollData = {
      id: Date.now().toString(),
      question: pollQuestion.trim(),
      options: validOptions,
      duration: pollDuration
    };

    // Verify socket connection
    if (!socket) {
      console.error('Socket not available');
      toast.error('Connection issue - socket not available');
      return;
    }
    
    if (!socket.connected) {
      console.error('Socket not connected, attempting to reconnect');
      toast.loading('Reconnecting to server...');
      
      // Try to reconnect
      socket.connect();
      
      // Wait a short time for connection and try again
      setTimeout(() => {
        if (socket.connected) {
          console.log('Reconnected successfully, trying to send poll again');
          sendPollToServer(poll);
        } else {
          toast.error('Could not reconnect to server');
        }
      }, 1000);
      return;
    }
    
    // If we're here, socket is connected, so send the poll directly
    sendPollToServer(poll);
  };
  
  // Separate function to send the poll to the server
  const sendPollToServer = (poll: PollData) => {
    if (!socket || !streamId) {
      toast.error('Connection issue - missing socket or streamId');
      return;
    }
    
    // First, reaffirm host status by rejoining stream
    console.log('Reaffirming host status before sending poll');
    socket.emit('join-stream', {
      streamId,
      userName: 'Host',
      isHost: true
    });

    // Wait a short time to ensure join event is processed
    setTimeout(() => {
      // Log complete data being sent for debugging
      const pollData = {
        streamId,
        poll,
        isHost: true,
        hostValidation: {
          timestamp: Date.now(),
          isExplicitlyHost: true
        },
        hostToken: hostToken
      };
      
      console.log('Sending poll with data:', pollData);
      
      // Send poll with explicit host flags
      socket.emit('stream-poll', pollData, (response: any) => {
        if (response?.error) {
          console.error('Error sending poll:', response.error, 'Full response:', response);
          toast.error(`Failed to send poll: ${response.error}`);
        } else {
          // Reset form and close modal on success
          toast.success('Poll sent successfully!');
          resetPollForm();
          setShowPollModal(false);
        }
      });
    }, 500);
  };

  const resetPollForm = () => {
    setPollQuestion('');
    setPollOptions([
      { id: '1', text: '' },
      { id: '2', text: '' },
    ]);
    setPollDuration(60);
  };

  return (
    <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-full ${
              isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
            } text-white transition-colors`}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          
          <button
            onClick={handleToggleVideo}
            className={`p-2 rounded-full ${
              isVideoEnabled ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'
            } text-white transition-colors`}
            aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Camera size={20} /> : <CameraOff size={20} />}
          </button>
          
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>

          {isLive && socket && socket.connected && (
            <button
              onClick={() => setShowPollModal(true)}
              className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              aria-label="Create Poll"
            >
              <BarChart2 size={20} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-700 px-3 py-1.5 rounded-full">
            <Users size={16} className="text-amber-400" />
            <span className="text-sm font-medium">{viewerCount} viewers</span>
          </div>
          
          {/* Stream control button - always visible */}
          <button
            disabled={isStartingStream}
            className={`px-4 py-2 rounded-md flex items-center gap-2 ${
              isLive
                ? 'bg-red-600 hover:bg-red-700' 
                : isStartingStream
                  ? 'bg-amber-700 opacity-75 cursor-wait'
                  : 'bg-amber-600 hover:bg-amber-700'
            } text-white font-medium transition-colors`}
            onClick={handleToggleLive}
          >
            <Monitor size={20} />
            {isLive 
              ? 'End Stream' 
              : isStartingStream 
                ? 'Starting...' 
                : 'Start Stream'}
          </button>
        </div>
      </div>
      
      {isSettingsOpen && (
        <div className="mt-4 p-4 bg-gray-700 rounded-lg">
          <h3 className="font-medium mb-3">Stream Settings</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Permissions Status</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      permissionStatus.camera === 'granted'
                        ? 'bg-green-500'
                        : permissionStatus.camera === 'denied'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}
                  />
                  <span>Camera: {permissionStatus.camera}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      permissionStatus.microphone === 'granted'
                        ? 'bg-green-500'
                        : permissionStatus.microphone === 'denied'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}
                  />
                  <span>Microphone: {permissionStatus.microphone}</span>
                </div>
              </div>
            </div>

            {isLive && socket && socket.connected && (
              <div>
                <button
                  onClick={() => setShowPollModal(true)}
                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center justify-center gap-2 transition-colors"
                >
                  <BarChart2 size={18} />
                  <span>Create Poll</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Poll Modal */}
      {showPollModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Create Poll</h2>
              <button 
                onClick={() => setShowPollModal(false)}
                className="p-1 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Poll Question */}
              <div>
                <label htmlFor="pollQuestion" className="block text-sm font-medium text-gray-300 mb-1">
                  Question
                </label>
                <input
                  id="pollQuestion"
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="What's your favorite bourbon?"
                />
              </div>

              {/* Poll Options */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Options
                </label>
                <div className="space-y-2">
                  {pollOptions.map((option, index) => (
                    <div key={option.id} className="flex gap-2">
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => handlePollOptionChange(option.id, e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={`Option ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(option.id)}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-red-400 hover:text-red-300"
                        disabled={pollOptions.length <= 2}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddPollOption}
                  className="mt-2 flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm"
                  disabled={pollOptions.length >= 6}
                >
                  <Plus size={16} />
                  <span>Add Option</span>
                </button>
              </div>

              {/* Poll Duration */}
              <div>
                <label htmlFor="pollDuration" className="block text-sm font-medium text-gray-300 mb-1">
                  Duration (seconds)
                </label>
                <select
                  id="pollDuration"
                  value={pollDuration}
                  onChange={(e) => setPollDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                  <option value={300}>5 minutes</option>
                  <option value={600}>10 minutes</option>
                </select>
              </div>

              {/* Submit and Cancel buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPollModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePoll}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <BarChart2 size={18} />
                  <span>Send Poll</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 