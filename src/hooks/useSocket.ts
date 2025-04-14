import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-hot-toast';

// Create a singleton socket instance that persists across renders
let globalSocketInstance: Socket | null = null;
// Global connection attempt tracking
let globalConnectionAttempts = 0;
// Track socket status globally to prevent multiple attempts
let isGloballyConnecting = false;
// Initialize once flag
let hasGloballyInitialized = false;

export function useSocket(streamId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectAttemptRef = useRef<number>(globalConnectionAttempts);
  const isAttemptingConnectionRef = useRef<boolean>(isGloballyConnecting);
  const didInitializeRef = useRef<boolean>(hasGloballyInitialized);
  const maxConnectAttempts = 3;
  const streamIdRef = useRef<string>(streamId);

  // Update streamId ref when it changes
  useEffect(() => {
    streamIdRef.current = streamId;
  }, [streamId]);

  // Use useCallback to create stable function references
  const createSocketConnection = useCallback(() => {
    // Prevent concurrent connection attempts
    if (isAttemptingConnectionRef.current || isGloballyConnecting) {
      console.log('Already attempting connection, skipping duplicate attempt');
      return;
    }
    
    // Use existing global socket if available
    if (globalSocketInstance?.connected) {
      console.log('Using existing global socket connection');
      socketRef.current = globalSocketInstance;
      didInitializeRef.current = true;
      hasGloballyInitialized = true;
      
      // Join the stream room with existing socket
      socketRef.current.emit('join-stream', streamIdRef.current);
      return;
    }
    
    // Prevent reconnection if already initialized and connected
    if (socketRef.current?.connected && didInitializeRef.current) {
      console.log('Socket already connected, skipping reconnection');
      return;
    }
    
    isAttemptingConnectionRef.current = true;
    isGloballyConnecting = true;
    
    // Increment attempt counter
    connectAttemptRef.current++;
    
    // Set up connection options with better timeout handling
    const origin = typeof window !== 'undefined' ? window.location.origin || '' : '';
    console.log('Origin for socket connection:', origin);
    console.log(`Socket connection attempt ${connectAttemptRef.current}/${maxConnectAttempts}`);
    
    // Detect Firefox browser
    const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('firefox');
    
    // Set transport strategy based on browser and connection attempt
    // Firefox works better with just polling to start
    const transports = isFirefox 
      ? ['polling'] 
      : (connectAttemptRef.current === 1 ? ['websocket', 'polling'] : ['polling']);
    
    const socketOptions = {
      path: '/api/socketio',
      transports: transports,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 40000, // Increase timeout for all browsers
      autoConnect: true,
      forceNew: false // Changed to false to not create new manager
    };

    console.log('Initializing socket with options:', socketOptions);
    
    try {
      // Create new socket only if needed
      if (!globalSocketInstance) {
        console.log('Creating new global socket connection');
        // Initialize socket connection with just origin, not path
        const socket = io(origin, socketOptions);
        socketRef.current = socket;
        globalSocketInstance = socket; // Store in global singleton
      } else {
        console.log('Reusing existing global socket connection');
        socketRef.current = globalSocketInstance;
        // Update options if needed
        if (socketRef.current.io) {
          socketRef.current.io.opts.transports = transports;
        }
        
        // Reconnect if not connected
        if (!socketRef.current.connected) {
          socketRef.current.connect();
        }
      }

      // Set up heartbeat to keep connection alive
      const setupHeartbeat = () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        heartbeatIntervalRef.current = setInterval(() => {
          if (socketRef.current?.connected) {
            socketRef.current.emit('ping', () => {
              // Heartbeat successful
            });
          }
        }, 25000); // Increase ping interval to reduce console logs
      };

      // Add connection event logging
      const socket = socketRef.current;
      
      // Only set up event listeners once
      if (!didInitializeRef.current) {
        socket.on('connect', () => {
          console.log('Socket connected with ID:', socket?.id);
          setConnectionError(null);
          isAttemptingConnectionRef.current = false;
          didInitializeRef.current = true;
          
          // Start heartbeat after connection
          setupHeartbeat();
          
          // Join the stream room
          socket?.emit('join-stream', streamIdRef.current);
        });
        
        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setConnectionError(`Connection error: ${error.message}`);
          
          // In development mode, provide a mock socket as fallback
          if (process.env.NODE_ENV === 'development') {
            console.log('Development mode: falling back to mock socket');
            createMockSocketForDev();
            isAttemptingConnectionRef.current = false;
            return;
          }
          
          // Special Firefox handling
          if (isFirefox && connectAttemptRef.current === 1) {
            console.log('Firefox-specific reconnection strategy');
            
            // Try again with polling only after a delay
            setTimeout(() => {
              isAttemptingConnectionRef.current = false;
              
              // Update options to polling only
              if (socket.io) {
                socket.io.opts.transports = ['polling'];
              }
              
              // Reconnect
              if (!socket.connected) {
                socket.connect();
              }
            }, 500);
            return;
          }
          
          // Try reconnecting with different transport if we haven't reached max attempts
          if (connectAttemptRef.current < maxConnectAttempts) {
            console.log(`Retrying connection (${connectAttemptRef.current}/${maxConnectAttempts})...`);
            
            // Try again after a delay
            setTimeout(() => {
              isAttemptingConnectionRef.current = false;
              
              // Update options if needed
              if (socket.io) {
                socket.io.opts.transports = ['polling'];
              }
              
              // Reconnect
              if (!socket.connected) {
                socket.connect();
              }
            }, 2000);
          } else {
            isAttemptingConnectionRef.current = false;
            toast.error('Failed to connect to streaming server after multiple attempts. Please try refreshing.');
          }
        });

        // Special handler for Firefox transport errors
        if (isFirefox) {
          const engine = (socket as any).io?.engine;
          if (engine) {
            engine.on('transportError', (err: any) => {
              console.error('Firefox transport error:', err);
              
              // If socket options exist and include WebSocket, retry with polling
              const opts = socket.io?.opts;
              if (opts && opts.transports && Array.isArray(opts.transports) && 
                  opts.transports.includes('websocket' as any)) {
                console.log('Firefox transport error - switching to polling only');
                
                // Force polling only
                socket.io.opts.transports = ['polling'] as any;
                
                // Try to reconnect with polling
                if (!socket.connected) {
                  socket.disconnect().connect();
                }
              }
            });
          }
        }

        socket.on('connect_timeout', (timeout) => {
          console.error('Socket connection timeout after (ms):', timeout);
          setConnectionError('Connection timeout. Please check your network.');
          isAttemptingConnectionRef.current = false;
        });

        socket.on('error', (error) => {
          console.error('Socket error:', error);
          setConnectionError(`Socket error: ${error}`);
          isAttemptingConnectionRef.current = false;
        });

        socket.on('disconnect', (reason) => {
          console.log('Socket disconnected, reason:', reason);
          
          // Only attempt reconnect if we're not already reconnecting and
          // it's due to a server or transport issue
          if ((reason === 'io server disconnect' || reason === 'transport error') && 
              !isAttemptingConnectionRef.current) {
            // Server disconnected us, try to reconnect
            if (!socket.connected) {
              socket.connect();
            }
          }
        });

        socket.on('reconnect', (attemptNumber) => {
          console.log('Socket reconnected after attempts:', attemptNumber);
          setConnectionError(null);
          isAttemptingConnectionRef.current = false;
          
          // Restart heartbeat after reconnection
          setupHeartbeat();
          
          // Rejoin the stream
          socket?.emit('join-stream', streamIdRef.current);
        });

        socket.on('reconnect_error', (error) => {
          console.error('Socket reconnection error:', error);
        });

        socket.on('reconnect_failed', () => {
          console.error('Socket reconnection failed after max attempts');
          setConnectionError('Failed to reconnect after several attempts.');
          isAttemptingConnectionRef.current = false;
          toast.error('Connection to streaming server failed. Please refresh the page.');
        });
      }
    } catch (error) {
      console.error('Error initializing socket:', error);
      setConnectionError(`Socket initialization error: ${error}`);
      
      // In development mode, provide a mock socket as fallback
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: falling back to mock socket after error');
        createMockSocketForDev();
        isAttemptingConnectionRef.current = false;
        return;
      }
      
      // Try again with simplified options if we haven't reached max attempts
      if (connectAttemptRef.current < maxConnectAttempts) {
        setTimeout(() => {
          isAttemptingConnectionRef.current = false;
          createSocketConnection();
        }, 2000);
      } else {
        isAttemptingConnectionRef.current = false;
      }
    }
  }, []);
  
  // Function to create a mock socket for development
  const createMockSocketForDev = useCallback(() => {
    console.log('Creating mock socket for useSocket hook');
    
    // Create event handlers
    const mockHandlers: Record<string, Function[]> = {};
    
    const mockSocket = {
      id: 'mock-hook-' + Math.random().toString(36).substr(2, 9),
      connected: true,
      
      // Event handling
      on: function(this: any, event: string, callback: Function) {
        if (!mockHandlers[event]) {
          mockHandlers[event] = [];
        }
        mockHandlers[event].push(callback);
        return this;
      },
      
      off: function(this: any, event: string, callback?: Function) {
        if (!mockHandlers[event]) return this;
        
        if (callback) {
          mockHandlers[event] = mockHandlers[event].filter(cb => cb !== callback);
        } else {
          delete mockHandlers[event];
        }
        return this;
      },
      
      once: function(this: any, event: string, callback: Function) {
        const onceWrapper = (...args: any[]) => {
          this.off(event, onceWrapper);
          callback.apply(this, args);
        };
        return this.on(event, onceWrapper);
      },
      
      emit: function(this: any, event: string, ...args: any[]) {
        console.log('Mock hook socket emit:', event, args);
        
        // Handle joining stream
        if (event === 'join-stream') {
          setTimeout(() => {
            this._triggerEvent('joined-stream', { streamId: streamIdRef.current, count: 1 });
          }, 100);
        }
        
        return this;
      },
      
      // Trigger an event to all listeners
      _triggerEvent: function(this: any, event: string, ...args: any[]) {
        const callbacks = mockHandlers[event] || [];
        callbacks.forEach(callback => {
          try {
            callback(...args);
          } catch (err) {
            console.error(`Error in mock hook socket event handler for ${event}:`, err);
          }
        });
      },
      
      removeAllListeners: function(this: any) {
        Object.keys(mockHandlers).forEach(event => {
          delete mockHandlers[event];
        });
        return this;
      },
      
      disconnect: function(this: any) {
        console.log('Mock hook socket disconnecting');
        this.connected = false;
        return this;
      },
      
      connect: function(this: any) {
        console.log('Mock socket connecting');
        this.connected = true;
        
        // Simulate connection
        setTimeout(() => {
          const connectCallbacks = mockHandlers['connect'] || [];
          connectCallbacks.forEach(callback => callback());
        }, 50);
        
        return this;
      },
      
      // Mock additional required properties
      io: {
        opts: {
          path: '/',
          transports: ['polling', 'websocket']
        }
      }
    } as unknown as Socket;
    
    // Simulate connection
    setTimeout(() => {
      const connectCallbacks = mockHandlers['connect'] || [];
      connectCallbacks.forEach(callback => callback());
    }, 50);
    
    // Store socket reference
    socketRef.current = mockSocket;
    setConnectionError(null);
    didInitializeRef.current = true;
    
    // Return the mock socket
    return mockSocket;
  }, []);

  // Main useEffect for socket setup - add a more stable connection check
  useEffect(() => {
    // Validate inputs
    if (!streamId) {
      console.error('No streamId provided to useSocket hook');
      return () => {};
    }

    if (typeof window === 'undefined' || !navigator) {
      console.log('Browser environment not available');
      return () => {};
    }

    // Initialize once - prevent duplicate initialization
    if (hasGloballyInitialized && globalSocketInstance) {
      console.log('Using globally initialized socket');
      socketRef.current = globalSocketInstance;
      
      // Make sure we're in the right room
      if (socketRef.current.connected) {
        console.log('Socket already connected, joining stream:', streamId);
        socketRef.current.emit('join-stream', streamId);
      }
    } else if (!didInitializeRef.current) {
      console.log('Initializing socket connection...');
      didInitializeRef.current = true;
      hasGloballyInitialized = true;
      createSocketConnection();
    }

    // Cleanup on unmount - but keep the socket alive for reuse
    return () => {
      console.log('Cleaning up socket listeners on unmount');
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Do not disconnect or destroy the socket, just leave the stream and remove listeners
      if (socketRef.current) {
        try {
          socketRef.current.emit('leave-stream', streamId);
          
          // Just remove event listeners that are specific to this component instance
          if (socketRef.current.hasListeners('offer')) socketRef.current.off('offer');
          if (socketRef.current.hasListeners('answer')) socketRef.current.off('answer');
          if (socketRef.current.hasListeners('ice-candidate')) socketRef.current.off('ice-candidate');
          if (socketRef.current.hasListeners('participant-count')) socketRef.current.off('participant-count');
          if (socketRef.current.hasListeners('chat-message')) socketRef.current.off('chat-message');
          if (socketRef.current.hasListeners('stream-poll')) socketRef.current.off('stream-poll');
          if (socketRef.current.hasListeners('poll-update')) socketRef.current.off('poll-update');
          if (socketRef.current.hasListeners('poll-end')) socketRef.current.off('poll-end');
          if (socketRef.current.hasListeners('error')) socketRef.current.off('error');
        } catch (err) {
          console.error('Error during socket cleanup:', err);
        }
      }
    };
  }, [streamId, createSocketConnection]);

  return socketRef.current;
} 