import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-hot-toast';

export function useSocket(streamId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectAttemptRef = useRef<number>(0);
  const maxConnectAttempts = 3;

  useEffect(() => {
    // Clean up any existing socket first
    if (socketRef.current) {
      console.log('Cleaning up existing socket connection');
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (err) {
        console.error('Error cleaning up socket:', err);
      }
      socketRef.current = null;
    }

    // Clean up any existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (typeof window === 'undefined' || !navigator || !navigator.onLine) {
      console.log('Browser environment not available or offline');
      return;
    }

    // Ensure we have a valid streamId
    if (!streamId) {
      console.error('No streamId provided to useSocket hook');
      return;
    }

    // Reset connection attempt counter
    connectAttemptRef.current = 0;

    // Function to create the socket connection with progressive retry
    const createSocketConnection = () => {
      // Increment attempt counter
      connectAttemptRef.current++;
      
      // Set up connection options with better timeout handling
      const origin = window.location.origin || '';
      console.log('Origin for socket connection:', origin);
      console.log(`Socket connection attempt ${connectAttemptRef.current}/${maxConnectAttempts}`);
      
      // Detect Firefox browser
      const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
      
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
        forceNew: true
      };

      console.log('Initializing socket with options:', socketOptions);
      
      try {
        // Initialize socket connection with just origin, not path
        const socket = io(origin, socketOptions);
        socketRef.current = socket;

        // Set up heartbeat to keep connection alive
        const setupHeartbeat = () => {
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          
          heartbeatIntervalRef.current = setInterval(() => {
            if (socket?.connected) {
              socket.emit('ping', (response: any) => {
                // Heartbeat successful
              });
            }
          }, 25000); // Increase ping interval to reduce console logs
        };

        // Add connection event logging
        socket.on('connect', () => {
          console.log('Socket connected with ID:', socket?.id);
          setConnectionError(null);
          
          // Start heartbeat after connection
          setupHeartbeat();
          
          // Join the stream room
          socket?.emit('join-stream', streamId);
        });
        
        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setConnectionError(`Connection error: ${error.message}`);
          
          // In development mode, provide a mock socket as fallback
          if (process.env.NODE_ENV === 'development') {
            console.log('Development mode: falling back to mock socket');
            createMockSocketForDev();
            return;
          }
          
          // Special Firefox handling
          if (isFirefox && connectAttemptRef.current === 1) {
            console.log('Firefox-specific reconnection strategy');
            // Clean up current socket
            socket.removeAllListeners();
            socket.disconnect();
            
            // Try again immediately with polling only
            setTimeout(() => {
              createSocketConnection();
            }, 500);
            return;
          }
          
          // Try reconnecting with different transport if we haven't reached max attempts
          if (connectAttemptRef.current < maxConnectAttempts) {
            console.log(`Retrying connection (${connectAttemptRef.current}/${maxConnectAttempts})...`);
            
            // Clean up current socket
            socket.removeAllListeners();
            socket.disconnect();
            
            // Try again after a delay
            setTimeout(() => {
              createSocketConnection();
            }, 2000);
          } else {
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
                socket.disconnect().connect();
              }
            });
          }
        }

        socket.on('connect_timeout', (timeout) => {
          console.error('Socket connection timeout after (ms):', timeout);
          setConnectionError('Connection timeout. Please check your network.');
        });

        socket.on('error', (error) => {
          console.error('Socket error:', error);
          setConnectionError(`Socket error: ${error}`);
        });

        socket.on('disconnect', (reason) => {
          console.log('Socket disconnected, reason:', reason);
          if (reason === 'io server disconnect' || reason === 'transport error') {
            // Server disconnected us, try to reconnect
            socket?.connect();
          }
        });

        socket.on('reconnect', (attemptNumber) => {
          console.log('Socket reconnected after attempts:', attemptNumber);
          setConnectionError(null);
          
          // Restart heartbeat after reconnection
          setupHeartbeat();
          
          // Rejoin the stream
          socket?.emit('join-stream', streamId);
        });

        socket.on('reconnect_error', (error) => {
          console.error('Socket reconnection error:', error);
        });

        socket.on('reconnect_failed', () => {
          console.error('Socket reconnection failed after max attempts');
          setConnectionError('Failed to reconnect after several attempts.');
          toast.error('Connection to streaming server failed. Please refresh the page.');
        });
      } catch (error) {
        console.error('Error initializing socket:', error);
        setConnectionError(`Socket initialization error: ${error}`);
        
        // In development mode, provide a mock socket as fallback
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: falling back to mock socket after error');
          createMockSocketForDev();
          return;
        }
        
        // Try again with simplified options if we haven't reached max attempts
        if (connectAttemptRef.current < maxConnectAttempts) {
          setTimeout(() => {
            createSocketConnection();
          }, 2000);
        }
      }
    };

    // Function to create a mock socket for development
    const createMockSocketForDev = () => {
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
              this._triggerEvent('joined-stream', { streamId, count: 1 });
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
      
      // Return the mock socket
      return mockSocket;
    };

    // Start the socket connection process
    createSocketConnection();

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket on unmount');
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      if (socketRef.current) {
        try {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
        } catch (err) {
          console.error('Error during socket cleanup:', err);
        }
        socketRef.current = null;
      }
    };
  }, [streamId]);

  return socketRef.current;
} 