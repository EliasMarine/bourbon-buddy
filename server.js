const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    path: '/api/socketio',
    transports: ['polling', 'websocket'],
    cors: {
      origin: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 10000,
    allowEIO3: true
  });

  // Track connected users and rooms
  const streamRooms = new Map();
  const chatHistory = new Map();

  // Socket connection handler
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Immediately acknowledge connection
    socket.emit('connection_confirmed', { id: socket.id });
    
    // Handle joining stream
    socket.on('join-stream', (data) => {
      let streamId;
      let userName;
      let isHost;
      
      // Handle different data formats
      if (typeof data === 'string') {
        streamId = data;
      } else if (typeof data === 'object' && data.streamId) {
        streamId = data.streamId;
        userName = data.userName;
        isHost = data.isHost;
      } else {
        console.error('Invalid join-stream data:', data);
        socket.emit('error', 'Invalid stream data');
        return;
      }
      
      // Join room
      socket.join(streamId);
      
      // Initialize room if needed
      if (!streamRooms.has(streamId)) {
        streamRooms.set(streamId, new Set());
      }
      
      // Add user to room
      streamRooms.get(streamId).add(socket.id);
      
      // Store for cleanup
      socket.data.streamId = streamId;
      socket.data.userName = userName;
      socket.data.isHost = isHost;
      
      // Emit updated count
      const count = streamRooms.get(streamId).size || 0;
      io.to(streamId).emit('viewer-count', count);
      
      console.log(`Client ${socket.id} joined stream ${streamId} - ${count} participants`);
      
      // Send chat history if available
      if (chatHistory.has(streamId)) {
        socket.emit('chat-history', Array.from(chatHistory.get(streamId)));
      }
      
      // Acknowledge join
      socket.emit('joined-stream', { 
        streamId, 
        count,
        userName: socket.data.userName,
        isHost: socket.data.isHost
      });
    });
    
    // Handle WebRTC signaling
    socket.on('signal', (data) => {
      try {
        const { to, signal, type } = data;
        
        if (!to || !signal || !type) {
          console.error('Invalid signal data:', data);
          return;
        }
        
        console.log(`Signal from ${socket.id} to ${to} of type ${type}`);
        
        // Forward the signal to the intended recipient
        socket.to(to).emit('signal', {
          from: socket.id,
          signal,
          type
        });
      } catch (err) {
        console.error('Error handling signal:', err);
        socket.emit('error', 'Error processing signal');
      }
    });
    
    // Handle chat messages
    socket.on('chat-message', (messageData) => {
      try {
        const { streamId, message, userName } = messageData;
        
        if (!streamId || !message) {
          console.error('Invalid chat message data:', messageData);
          return;
        }
        
        // Initialize chat history if needed
        if (!chatHistory.has(streamId)) {
          chatHistory.set(streamId, []);
        }
        
        // Create message object with timestamp
        const chatMessage = {
          id: Date.now().toString(),
          senderId: socket.id,
          userName: userName || 'Anonymous',
          message,
          timestamp: new Date().toISOString()
        };
        
        // Store in history (limit to last 100 messages)
        const history = chatHistory.get(streamId);
        history.push(chatMessage);
        if (history.length > 100) {
          history.shift();
        }
        
        // Broadcast to room
        io.to(streamId).emit('chat-message', chatMessage);
      } catch (err) {
        console.error('Error handling chat message:', err);
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Client ${socket.id} disconnected:`, reason);
      
      // Remove from room
      const streamId = socket.data.streamId;
      if (streamId && streamRooms.has(streamId)) {
        streamRooms.get(streamId).delete(socket.id);
        
        // Emit updated count
        const count = streamRooms.get(streamId).size || 0;
        io.to(streamId).emit('viewer-count', count);
        
        // Clean up empty rooms
        if (count === 0) {
          streamRooms.delete(streamId);
          chatHistory.delete(streamId);
        }
      }
    });
    
    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket ${socket.id} error:`, error);
    });
    
    // Handle ping
    socket.on('ping', (callback) => {
      if (typeof callback === 'function') {
        callback({ time: Date.now() });
      }
    });
  });

  // Start the server
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}); 