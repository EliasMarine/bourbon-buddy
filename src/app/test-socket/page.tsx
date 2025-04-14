'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Link from 'next/link';

export default function TestSocketPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [testStreamId, setTestStreamId] = useState('test-stream-123');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].slice(0, 8)}: ${message}`]);
  };

  useEffect(() => {
    let socketInstance: Socket | null = null;
    let cleanup: () => void = () => {};
    
    // Prevent reconnection loops
    if (reconnectAttempts > 3) {
      addLog('Max reconnection attempts reached. Please refresh manually.');
      return () => {};
    }
    
    if (isReconnecting) {
      return () => {};
    }

    const initializeSocket = () => {
      try {
        addLog('Initializing Socket.IO connection...');
        
        // Determine socket URL based on environment
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
        addLog(`Using Socket URL: ${socketUrl}`);
        
        // Socket.IO options
        const socketOptions = {
          path: '/api/socketio',
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
          timeout: 20000,
          autoConnect: true
        };
        
        addLog(`Socket.IO options: ${JSON.stringify(socketOptions)}`);
        
        // Create socket connection
        const newSocket = io(socketUrl, socketOptions);
        socketInstance = newSocket;
        setSocket(newSocket);
        
        // Socket event handlers
        newSocket.on('connect', () => {
          const id = newSocket.id;
          addLog(`Connected with ID: ${id || 'unknown'}`);
          setConnected(true);
          // Only set socket ID if it's defined
          if (id) {
            setSocketId(id);
          }
          setError(null);
          setReconnectAttempts(0);
        });
        
        newSocket.on('connect_error', (err) => {
          addLog(`Connection error: ${err.message}`);
          setError(`Connection error: ${err.message}`);
        });
        
        newSocket.on('error', (err) => {
          addLog(`Socket error: ${typeof err === 'string' ? err : JSON.stringify(err)}`);
          setError(typeof err === 'string' ? err : JSON.stringify(err));
        });
        
        newSocket.on('disconnect', (reason) => {
          addLog(`Disconnected: ${reason}`);
          setConnected(false);
          setSocketId(null);
          
          if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            // Manual disconnection, don't reconnect
            addLog('Manual disconnection, not reconnecting.');
          } else {
            // Auto reconnect on transient errors, but prevent infinite loops
            addLog(`Will try to reconnect. Attempt ${reconnectAttempts + 1}`);
            setReconnectAttempts(prev => prev + 1);
          }
        });
        
        // Clean up on unmount
        cleanup = () => {
          addLog('Cleaning up socket connection');
          if (newSocket) {
            newSocket.removeAllListeners();
            newSocket.disconnect();
            socketInstance = null;
          }
        };
      } catch (err) {
        addLog(`Error initializing socket: ${err instanceof Error ? err.message : String(err)}`);
        setError(`Error initializing socket: ${err instanceof Error ? err.message : String(err)}`);
        cleanup = () => {}; // Empty cleanup
      }
    };
    
    initializeSocket();
    return cleanup;
  }, [reconnectAttempts]);
  
  const joinStream = () => {
    if (!socket || !connected) {
      addLog('Cannot join stream: Socket not connected');
      return;
    }
    
    addLog(`Joining stream: ${testStreamId}`);
    socket.emit('join-stream', { streamId: testStreamId });
    
    socket.on('joined-stream', (data) => {
      addLog(`Joined stream: ${JSON.stringify(data)}`);
    });
    
    socket.on('viewer-count', (count) => {
      addLog(`Viewer count: ${count}`);
    });
  };
  
  const pingServer = () => {
    if (!socket || !connected) {
      addLog('Cannot ping: Socket not connected');
      return;
    }
    
    addLog('Pinging server...');
    const startTime = Date.now();
    
    socket.emit('ping', (response: any) => {
      const latency = Date.now() - startTime;
      addLog(`Ping response (${latency}ms): ${JSON.stringify(response)}`);
    });
  };
  
  const disconnect = () => {
    if (!socket) {
      addLog('No socket to disconnect');
      return;
    }
    
    addLog('Manually disconnecting...');
    socket.disconnect();
  };
  
  const reconnect = () => {
    if (socket) {
      addLog('Reconnecting...');
      setIsReconnecting(true);
      socket.connect();
      
      // Reset reconnecting flag after a short delay
      setTimeout(() => {
        setIsReconnecting(false);
      }, 1000);
    } else {
      addLog('No socket to reconnect');
      setReconnectAttempts(0); // Reset attempts to trigger a new connection
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Socket.IO Connection Test</h1>
      
      <div className="mb-8 p-4 rounded-lg bg-gray-800">
        <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
        <div className="flex items-center space-x-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <p>{connected ? 'Connected' : 'Disconnected'}</p>
        </div>
        {socketId && <p className="text-sm mb-2">Socket ID: <span className="font-mono">{socketId}</span></p>}
        {error && <p className="text-red-400 text-sm mt-2">Error: {error}</p>}
        {reconnectAttempts > 0 && (
          <p className="text-amber-400 text-sm mt-2">Reconnect attempts: {reconnectAttempts}/3</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-4 rounded-lg bg-gray-800">
          <h2 className="text-xl font-semibold mb-2">Server Info</h2>
          <p className="mb-2">Environment: <span className="font-mono">{process.env.NODE_ENV}</span></p>
          <p className="mb-2">Socket URL: <span className="font-mono">{process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin}</span></p>
          <p className="mb-2">Socket Path: <span className="font-mono">/api/socketio</span></p>
        </div>
        
        <div className="p-4 rounded-lg bg-gray-800">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input 
                type="text" 
                value={testStreamId} 
                onChange={e => setTestStreamId(e.target.value)}
                className="rounded bg-gray-700 px-3 py-2 text-sm w-full" 
                placeholder="Stream ID"
              />
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={joinStream}
                disabled={!connected}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm disabled:opacity-50"
              >
                Join Stream
              </button>
              <button 
                onClick={pingServer}
                disabled={!connected}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm disabled:opacity-50"
              >
                Ping Server
              </button>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={disconnect}
                disabled={!connected}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm disabled:opacity-50"
              >
                Disconnect
              </button>
              <button 
                onClick={reconnect}
                disabled={connected || isReconnecting}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm disabled:opacity-50"
              >
                Reconnect
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 rounded-lg bg-gray-800">
        <h2 className="text-xl font-semibold mb-2">Connection Logs</h2>
        <div className="bg-gray-900 p-4 rounded max-h-80 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="font-mono text-xs mb-1">{log}</div>
          ))}
          {logs.length === 0 && <div className="text-gray-500 text-sm">No logs yet</div>}
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <Link href="/" className="text-amber-500 hover:text-amber-400">
          Back to Home
        </Link>
      </div>
    </div>
  );
} 