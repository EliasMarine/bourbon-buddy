'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export default function TestSocketPage() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [socketId, setSocketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Log for debugging
    console.log('Testing socket connection');
    
    // Create connection
    try {
      // Set URL for local development
      const isDev = process.env.NODE_ENV !== 'production';
      const socketUrl = isDev ? 'http://localhost:3000' : `${window.location.protocol}//${window.location.host}`;
      
      addMessage(`Connecting to ${socketUrl} (path: /api/socketio)`);
      
      socketRef.current = io(socketUrl, {
        path: '/api/socketio',
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        timeout: 10000
      });
      
      // Connection events
      socketRef.current.on('connect', () => {
        setStatus('connected');
        setSocketId(socketRef.current?.id || null);
        addMessage(`Connected with ID: ${socketRef.current?.id}`);
        
        // Join test room
        socketRef.current?.emit('join-stream', {
          streamId: 'test-stream',
          userName: 'Test User',
          isHost: false
        });
      });
      
      socketRef.current.on('connection_confirmed', (data) => {
        addMessage(`Connection confirmed: ${JSON.stringify(data)}`);
      });
      
      socketRef.current.on('connect_error', (err) => {
        setStatus('error');
        const errorMsg = `Connection error: ${err.message}`;
        setError(errorMsg);
        addMessage(errorMsg);
      });
      
      socketRef.current.on('joined-stream', (data) => {
        addMessage(`Joined stream: ${JSON.stringify(data)}`);
      });
      
      socketRef.current.on('viewer-count', (count) => {
        addMessage(`Viewer count: ${count}`);
      });
      
      socketRef.current.on('disconnect', (reason) => {
        setStatus('connecting');
        addMessage(`Disconnected: ${reason}`);
      });
    } catch (err: any) {
      setStatus('error');
      const errorMsg = `Socket initialization error: ${err.message || 'Unknown error'}`;
      setError(errorMsg);
      addMessage(errorMsg);
    }
    
    // Cleanup
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);
  
  const addMessage = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, `[${timestamp}] ${msg}`]);
  };
  
  const handleSendTestMessage = () => {
    if (socketRef.current?.connected) {
      addMessage('Sending test message');
      socketRef.current.emit('chat-message', {
        streamId: 'test-stream',
        message: {
          id: Date.now().toString(),
          user: 'Test User',
          content: 'Test message: ' + new Date().toISOString(),
          isHost: false,
          timestamp: Date.now()
        }
      });
    } else {
      addMessage('Cannot send: not connected');
    }
  };
  
  const handlePingTest = () => {
    if (socketRef.current?.connected) {
      addMessage('Sending ping...');
      socketRef.current.emit('ping', (response: any) => {
        addMessage(`Ping response: ${JSON.stringify(response)}`);
      });
    } else {
      addMessage('Cannot ping: not connected');
    }
  };
  
  const handleReconnect = () => {
    if (socketRef.current) {
      addMessage('Manually reconnecting...');
      socketRef.current.connect();
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Socket.IO Connection Test</h1>
      
      <div className="mb-4 p-4 rounded border">
        <div className="flex items-center gap-4 mb-4">
          <div className="font-semibold">Status:</div>
          <div className="flex items-center">
            <div 
              className={`w-3 h-3 rounded-full mr-2 ${
                status === 'connected' ? 'bg-green-500' : 
                status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}
            />
            <span>{status}</span>
          </div>
        </div>
        
        {socketId && (
          <div className="mb-4">
            <div className="font-semibold">Socket ID:</div>
            <div className="font-mono bg-gray-100 p-2 rounded mt-1">{socketId}</div>
          </div>
        )}
        
        {error && (
          <div className="mb-4">
            <div className="font-semibold text-red-600">Error:</div>
            <div className="bg-red-50 text-red-800 p-2 rounded mt-1">{error}</div>
          </div>
        )}
        
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSendTestMessage}
            disabled={status !== 'connected'}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Send Test Message
          </button>
          
          <button
            onClick={handlePingTest}
            disabled={status !== 'connected'}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            Ping Server
          </button>
          
          <button
            onClick={handleReconnect}
            disabled={status === 'connected'}
            className="px-4 py-2 bg-amber-600 text-white rounded disabled:opacity-50"
          >
            Reconnect
          </button>
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Event Log:</h2>
        <div className="bg-gray-100 p-4 rounded h-80 overflow-y-auto font-mono text-sm">
          {messages.length === 0 && (
            <div className="text-gray-500">No events recorded yet...</div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className="mb-1">{msg}</div>
          ))}
        </div>
      </div>
    </div>
  );
} 