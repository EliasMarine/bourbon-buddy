const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

// Add security verification (this will dynamically require our TS files)
const securityCheck = async () => {
  try {
    // Only run in production mode
    if (process.env.NODE_ENV === 'production') {
      console.log('Running security checks...');
      
      // Dynamically import the TS module (works with ts-node)
      const { ensureNoTestEndpoints } = require('./src/lib/login-security');
      
      // Run the check
      ensureNoTestEndpoints();
      
      console.log('Security checks completed.');
    }
  } catch (error) {
    console.error('Error during security checks:', error);
  }
};

// Run security check
securityCheck();

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
  const activePolls = new Map(); // Map<pollId, pollData>
  const pollVotes = new Map(); // Map<pollId, Map<userId, optionId>>
  const pollTimers = new Map(); // Map<pollId, timeoutId>
  const hostTokens = new Map(); // Map<streamId, Set<validTokens>>

  // Helper to generate a host token
  function generateHostToken(streamId, socketId) {
    const token = `host_${streamId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Initialize token set for this stream if it doesn't exist
    if (!hostTokens.has(streamId)) {
      hostTokens.set(streamId, new Set());
    }
    
    // Store the token
    hostTokens.get(streamId).add(token);
    
    console.log(`Generated host token for stream ${streamId}, socket ${socketId}: ${token}`);
    
    return token;
  }
  
  // Helper to validate a host token
  function validateHostToken(streamId, token) {
    if (!hostTokens.has(streamId)) {
      return false;
    }
    
    return hostTokens.get(streamId).has(token);
  }

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
      
      // Log detailed connection info for debugging
      console.log(`Client ${socket.id} joined stream ${streamId} - ${userName || 'Anonymous'} - Host status: ${isHost ? 'true' : 'false'}`);
      console.log(`Socket data after join - isHost: ${socket.data.isHost}, userName: ${socket.data.userName}`);
      
      // Generate host token if this is a host
      let hostToken = null;
      if (isHost === true) {
        hostToken = generateHostToken(streamId, socket.id);
        // Store it on the socket too for easy reference
        socket.data.hostToken = hostToken;
        console.log(`Host token generated and stored for socket ${socket.id}: ${hostToken}`);
      }
      
      // Emit updated count
      const count = streamRooms.get(streamId).size || 0;
      io.to(streamId).emit('viewer-count', count);
      
      console.log(`Client ${socket.id} joined stream ${streamId} - ${count} participants`);
      
      // Send chat history if available
      if (chatHistory.has(streamId)) {
        socket.emit('chat-history', Array.from(chatHistory.get(streamId)));
      }
      
      // Send active polls if available for this stream
      const streamActivePolls = [];
      activePolls.forEach((poll, pollId) => {
        if (poll.streamId === streamId && !poll.isEnded) {
          streamActivePolls.push(poll);
        }
      });
      
      if (streamActivePolls.length > 0) {
        socket.emit('active-polls', streamActivePolls);
      }
      
      // Acknowledge join
      socket.emit('joined-stream', { 
        streamId, 
        count,
        userName: socket.data.userName,
        isHost: socket.data.isHost,
        hostToken: hostToken // Include the token in the response if this is a host
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
    
    // Handle polls
    socket.on('stream-poll', (data, callback) => {
      try {
        console.log('Received poll creation request from socket:', socket.id);
        console.log('Socket data:', socket.data);
        console.log('Poll request data:', data);
        
        const { streamId, poll, isHost, hostValidation, hostToken } = data;
        
        if (!streamId || !poll || !poll.id || !poll.question || !poll.options || !poll.duration) {
          console.error('Invalid poll data:', data);
          if (callback) callback({ error: 'Invalid poll data' });
          return;
        }
        
        // Enhanced host validation - check multiple indicators
        const socketIsHost = socket.data.isHost === true;
        const dataIsHost = isHost === true;
        const validationIsHost = hostValidation && hostValidation.isExplicitlyHost === true;
        
        // Check host token validation
        const hasValidToken = hostToken && validateHostToken(streamId, hostToken);
        // Also check the token stored on the socket
        const hasSocketToken = socket.data.hostToken && validateHostToken(streamId, socket.data.hostToken);
        
        // If ANY of the host indicators are true, consider this a host
        const userIsHost = socketIsHost || dataIsHost || validationIsHost || hasValidToken || hasSocketToken;
        
        // Detailed logging for debugging
        console.log('Host validation check:', {
          socketId: socket.id,
          socketIsHost,
          dataIsHost,
          validationIsHost,
          hasValidToken,
          hasSocketToken,
          token: hostToken,
          socketToken: socket.data.hostToken,
          finalDecision: userIsHost
        });
        
        // Only hosts can create polls
        if (!userIsHost) {
          console.error('Non-host tried to create poll:', {
            socketId: socket.id,
            socketIsHost,
            dataIsHost,
            validationIsHost,
            socketData: socket.data
          });
          
          if (callback) callback({ 
            error: 'Only hosts can create polls',
            debug: {
              socketIsHost,
              dataIsHost,
              validationIsHost,
              socketData: {
                isHost: socket.data.isHost,
                userName: socket.data.userName,
                streamId: socket.data.streamId
              }
            }
          });
          return;
        }
        
        console.log(`Host ${socket.id} creating poll in stream ${streamId}:`, poll.question);
        
        // Create poll object with additional data
        const pollData = {
          ...poll,
          streamId,
          createdAt: Date.now(),
          createdBy: socket.id,
          results: {},
          totalVotes: 0,
          isEnded: false
        };
        
        // Initialize results with zero for each option
        poll.options.forEach(option => {
          pollData.results[option.id] = 0;
        });
        
        // Store poll
        activePolls.set(poll.id, pollData);
        
        // Initialize votes map
        pollVotes.set(poll.id, new Map());
        
        console.log(`New poll created in stream ${streamId}:`, poll.question);
        
        // Broadcast to room
        io.to(streamId).emit('stream-poll', { poll: pollData });
        
        // Set a timer to end the poll
        const timerId = setTimeout(() => {
          endPoll(poll.id, streamId);
        }, poll.duration * 1000);
        
        pollTimers.set(poll.id, timerId);
        
        // Acknowledge
        if (callback) callback({ success: true });
      } catch (err) {
        console.error('Error handling poll creation:', err);
        if (callback) callback({ error: 'Error processing poll' });
      }
    });
    
    // Handle poll votes
    socket.on('poll-vote', (data, callback) => {
      try {
        const { streamId, vote } = data;
        
        if (!streamId || !vote || !vote.pollId || !vote.optionId || !vote.userId) {
          console.error('Invalid vote data:', data);
          if (callback) callback({ error: 'Invalid vote data' });
          return;
        }
        
        const { pollId, optionId, userId } = vote;
        
        // Check if poll exists and is active
        if (!activePolls.has(pollId)) {
          console.error('Vote for non-existent poll:', pollId);
          if (callback) callback({ error: 'Poll not found' });
          return;
        }
        
        const poll = activePolls.get(pollId);
        
        // Check if poll is ended
        if (poll.isEnded) {
          console.error('Vote for ended poll:', pollId);
          if (callback) callback({ error: 'Poll has ended' });
          return;
        }
        
        // Check if option exists
        if (!poll.options.some(opt => opt.id === optionId)) {
          console.error('Vote for non-existent option:', optionId);
          if (callback) callback({ error: 'Option not found' });
          return;
        }
        
        // Check if user already voted
        if (pollVotes.get(pollId).has(userId)) {
          console.error('User already voted:', userId);
          if (callback) callback({ error: 'You already voted in this poll' });
          return;
        }
        
        // Record vote
        pollVotes.get(pollId).set(userId, optionId);
        
        // Update results
        poll.results[optionId]++;
        poll.totalVotes++;
        
        console.log(`New vote for poll ${pollId}, option ${optionId} by user ${userId}`);
        
        // Broadcast updated results
        io.to(streamId).emit('poll-update', {
          pollId,
          results: poll.results,
          totalVotes: poll.totalVotes
        });
        
        // Acknowledge
        if (callback) callback({ success: true });
      } catch (err) {
        console.error('Error handling poll vote:', err);
        if (callback) callback({ error: 'Error processing vote' });
      }
    });
    
    // Handle manual poll end (by host)
    socket.on('end-poll', (data, callback) => {
      try {
        const { streamId, pollId } = data;
        
        if (!streamId || !pollId) {
          console.error('Invalid end-poll data:', data);
          if (callback) callback({ error: 'Invalid data' });
          return;
        }
        
        // Only hosts can end polls
        if (!socket.data.isHost) {
          console.error('Non-host tried to end poll:', socket.id);
          if (callback) callback({ error: 'Only hosts can end polls' });
          return;
        }
        
        // End the poll
        const success = endPoll(pollId, streamId);
        
        // Acknowledge
        if (callback) callback({ success });
      } catch (err) {
        console.error('Error handling poll end:', err);
        if (callback) callback({ error: 'Error ending poll' });
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
          
          // End all polls for this stream
          activePolls.forEach((poll, pollId) => {
            if (poll.streamId === streamId) {
              endPoll(pollId, streamId);
            }
          });
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
  
  // Helper function to end a poll
  function endPoll(pollId, streamId) {
    if (!activePolls.has(pollId)) {
      console.error('Tried to end non-existent poll:', pollId);
      return false;
    }
    
    const poll = activePolls.get(pollId);
    
    // Check if already ended
    if (poll.isEnded) {
      return false;
    }
    
    // Mark as ended
    poll.isEnded = true;
    
    console.log(`Poll ${pollId} ended with ${poll.totalVotes} votes`);
    
    // Clear timeout if exists
    if (pollTimers.has(pollId)) {
      clearTimeout(pollTimers.get(pollId));
      pollTimers.delete(pollId);
    }
    
    // Broadcast end event
    io.to(streamId).emit('poll-end', {
      pollId,
      results: poll.results,
      totalVotes: poll.totalVotes
    });
    
    // Keep poll data for some time (15 minutes) for late viewers
    setTimeout(() => {
      if (activePolls.has(pollId)) {
        activePolls.delete(pollId);
      }
      if (pollVotes.has(pollId)) {
        pollVotes.delete(pollId);
      }
    }, 15 * 60 * 1000);
    
    return true;
  }

  // Start the server
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}); 