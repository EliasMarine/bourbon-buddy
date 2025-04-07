'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Smile, ChevronDown, ChevronUp, BarChart2, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Socket, io } from 'socket.io-client';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  user: string;
  content: string;
  isHost: boolean;
  timestamp: number;
  type?: 'text';
}

interface PollOption {
  id: string;
  text: string;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  duration: number; // in seconds
  createdAt: number;
  results?: Record<string, number>; // option id -> vote count
  totalVotes?: number;
  isEnded?: boolean;
}

interface PollVote {
  pollId: string;
  optionId: string;
  userId: string;
}

interface ChatBoxProps {
  streamId: string;
  isHost: boolean;
  userName: string;
  socket?: Socket | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function ChatBox({ 
  streamId, 
  isHost, 
  userName, 
  socket: externalSocket,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  // Poll states
  const [activePolls, setActivePolls] = useState<Poll[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Use external or internal collapse state
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalIsCollapsed(!internalIsCollapsed);
    }
  };

  // Initialize socket connection
  useEffect(() => {
    if (!streamId) return;

    const initializeSocket = () => {
      try {
        // Use external socket if provided
        if (externalSocket) {
          console.log('Using external socket');
          socketRef.current = externalSocket;
          setIsConnected(externalSocket.connected);
          setIsConnecting(false);
          
          // Setup event listeners for external socket
          externalSocket.on('connect', () => {
            console.log('External socket connected');
            setIsConnected(true);
            setIsConnecting(false);
            setError(null);
          });
          
          externalSocket.on('disconnect', () => {
            console.log('External socket disconnected');
            setIsConnected(false);
          });
          
          return;
        }

        // Create new socket connection
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
          (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : window.location.origin);

        console.log('Connecting to socket server at:', socketUrl);

        const socket = io(socketUrl, {
          path: '/api/socketio',
          transports: ['polling', 'websocket'], // Try polling first, then websocket
          reconnectionAttempts: maxReconnectAttempts,
          reconnectionDelay: 1000,
          timeout: 10000,
          autoConnect: true
        });

        socketRef.current = socket;

        // Setup event listeners
        socket.on('connect', () => {
          console.log('Socket connected');
          setIsConnected(true);
          setIsConnecting(false);
          setError(null);
          
          // Join stream room
          socket.emit('join-stream', {
            streamId,
            userName: userName || 'Anonymous',
            isHost
          }, (response: any) => {
            if (response?.error) {
              console.error('Error joining stream:', response.error);
              setError(`Failed to join chat: ${response.error}`);
            }
          });
        });

        socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          setIsConnected(false);
          
          if (reason === 'io server disconnect') {
            // Server disconnected us, try to reconnect
            socket.connect();
          }
        });

        socket.on('chat-message', (message: Message) => {
          setMessages(prev => [...prev, message]);
        });

        socket.on('chat-history', (history: Message[]) => {
          setMessages(history);
        });

        socket.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          setError('Connection error - please try running with "npm run dev:realtime"');
          setIsConnecting(false);
          
          // If we're in development, show a more helpful message
          if (process.env.NODE_ENV === 'development') {
            toast.error('Please run the app with "npm run dev:realtime"', {
              duration: 5000,
            });
          }
        });

        socket.on('error', (err) => {
          console.error('Socket error:', err);
          setError('Chat connection error. Please try refreshing the page.');
          setIsConnecting(false);
        });

      } catch (err) {
        console.error('Socket initialization error:', err);
        setError('Failed to initialize chat');
        setIsConnecting(false);
        
        if (process.env.NODE_ENV === 'development') {
          toast.error('Chat initialization failed. Please run with "npm run dev:realtime"');
        }
      }
    };

    // Initialize socket with a slight delay to ensure proper cleanup
    const initTimer = setTimeout(() => {
      initializeSocket();
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(initTimer);
      if (socketRef.current && !externalSocket) {
        console.log('Cleaning up socket connection');
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [streamId, userName, isHost, externalSocket]);

  // Set up poll event listeners
  useEffect(() => {
    if (!socketRef.current) return;
    
    const socket = socketRef.current;
    
    // Listen for new polls
    socket.on('stream-poll', (data: { poll: Poll }) => {
      // Add system message about new poll
      const systemMessage: Message = {
        id: `poll-announce-${Date.now()}`,
        user: 'System',
        content: `📊 ${data.poll.question}`,
        isHost: true,
        timestamp: Date.now(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, systemMessage]);
      
      // Add poll to active polls
      setActivePolls(prev => [...prev, {
        ...data.poll,
        createdAt: Date.now(),
        results: {},
        totalVotes: 0
      }]);
      
      // Auto-scroll to the new poll
      setTimeout(scrollToBottom, 100);
    });
    
    // Listen for poll updates (votes)
    socket.on('poll-update', (data: { pollId: string, results: Record<string, number>, totalVotes: number }) => {
      setActivePolls(prev => 
        prev.map(poll => 
          poll.id === data.pollId 
            ? { ...poll, results: data.results, totalVotes: data.totalVotes }
            : poll
        )
      );
    });
    
    // Listen for poll end
    socket.on('poll-end', (data: { pollId: string, results: Record<string, number>, totalVotes: number }) => {
      // Mark poll as ended
      setActivePolls(prev => 
        prev.map(poll => 
          poll.id === data.pollId 
            ? { ...poll, isEnded: true, results: data.results, totalVotes: data.totalVotes }
            : poll
        )
      );
      
      // Add system message about poll results
      const poll = activePolls.find(p => p.id === data.pollId);
      if (poll) {
        // Find the winning option(s)
        const maxVotes = Math.max(...Object.values(data.results));
        const winningOptionIds = Object.entries(data.results)
          .filter(([_, votes]) => votes === maxVotes)
          .map(([id]) => id);
        
        const winningOptions = poll.options
          .filter(opt => winningOptionIds.includes(opt.id))
          .map(opt => opt.text);
        
        let resultMessage = `📊 Poll ended: "${poll.question}"\n`;
        if (data.totalVotes === 0) {
          resultMessage += "No one voted in this poll.";
        } else if (winningOptions.length === 1) {
          resultMessage += `Winner: ${winningOptions[0]} with ${maxVotes} vote${maxVotes !== 1 ? 's' : ''}.`;
        } else {
          resultMessage += `Tie between: ${winningOptions.join(', ')} with ${maxVotes} vote${maxVotes !== 1 ? 's' : ''} each.`;
        }
        
        const systemMessage: Message = {
          id: `poll-result-${Date.now()}`,
          user: 'System',
          content: resultMessage,
          isHost: true,
          timestamp: Date.now(),
          type: 'text'
        };
        
        setMessages(prev => [...prev, systemMessage]);
      }
    });
    
    return () => {
      socket.off('stream-poll');
      socket.off('poll-update');
      socket.off('poll-end');
    };
  }, [activePolls]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const cleanup = scrollToBottom();
    return cleanup;
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker && 
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Clean up expired polls
  useEffect(() => {
    // Check for expired polls every 5 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      setActivePolls(prev => prev.filter(poll => {
        // Keep if poll is ended (to show results) or still active
        return poll.isEnded || now - poll.createdAt < poll.duration * 1000;
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      
      const observer = new MutationObserver(() => {
        container.scrollTop = container.scrollHeight;
      });
      
      observer.observe(container, { childList: true, subtree: true });
      
      return () => {
        observer.disconnect();
      };
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isConnected) return;
    
    const message: Message = {
      id: Date.now().toString(),  
      user: userName || 'Anonymous',
      content: newMessage.trim(),
      isHost: isHost,
      timestamp: Date.now(),
      type: 'text'
    };

    // Add message locally first (optimistic update)
    setMessages(prev => [...prev, message]);
    
    // Clear input immediately for better UX
    setNewMessage('');
    
    // Send to server
    try {
      socketRef.current?.emit('chat-message', {
        streamId,
        message
      }, (error: any) => {
        if (error) {
          console.error('Failed to send message:', error);
          // Remove the message if it failed to send
          setMessages(prev => prev.filter(m => m.id !== message.id));
          setNewMessage(message.content); // Restore the message content
          toast.error('Failed to send message. Please try again.');
        }
      });
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove the message if it failed to send
      setMessages(prev => prev.filter(m => m.id !== message.id));
      setNewMessage(message.content); // Restore the message content
      toast.error('Failed to send message. Please try again.');
    }
  };

  // Add reconnection handler
  const handleReconnect = () => {
    if (!socketRef.current?.connected) {
      console.log('Attempting to reconnect...');
      socketRef.current?.connect();
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    setNewMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  // Poll vote handler
  const handlePollVote = (pollId: string, optionId: string) => {
    if (!session?.user?.id) {
      toast.error('You must be signed in to vote');
      return;
    }
    
    if (userVotes[pollId]) {
      toast.error('You have already voted in this poll');
      return;
    }
    
    // Check if poll is still active
    const poll = activePolls.find(p => p.id === pollId);
    if (!poll || poll.isEnded) {
      toast.error('This poll has ended');
      return;
    }
    
    // Create vote object
    const vote: PollVote = {
      pollId,
      optionId,
      userId: session.user.id
    };
    
    // Update UI optimistically
    setUserVotes(prev => ({
      ...prev,
      [pollId]: optionId
    }));
    
    // Send vote to server
    socketRef.current?.emit('poll-vote', {
      streamId,
      vote
    }, (response: any) => {
      if (response?.error) {
        console.error('Failed to submit vote:', response.error);
        // Remove the vote if it failed
        setUserVotes(prev => {
          const { [pollId]: _, ...rest } = prev;
          return rest;
        });
        toast.error(`Failed to vote: ${response.error}`);
      } else {
        toast.success('Vote submitted!');
      }
    });
  };

  // Calculate time remaining for a poll
  const getPollTimeRemaining = (poll: Poll) => {
    if (poll.isEnded) return 'Ended';
    
    const elapsedMs = Date.now() - poll.createdAt;
    const remainingMs = (poll.duration * 1000) - elapsedMs;
    
    if (remainingMs <= 0) return 'Ending...';
    
    const remainingSeconds = Math.floor(remainingMs / 1000);
    if (remainingSeconds < 60) return `${remainingSeconds}s`;
    
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Get percentage width for poll results bar
  const getOptionPercentage = (poll: Poll, optionId: string) => {
    if (!poll.totalVotes || poll.totalVotes === 0) return 0;
    const votes = poll.results?.[optionId] || 0;
    return (votes / poll.totalVotes) * 100;
  };

  // Render poll component
  const renderPoll = (poll: Poll) => (
    <div 
      key={poll.id} 
      className="my-4 bg-gray-700 rounded-lg overflow-hidden border border-gray-600"
    >
      <div className="p-3 bg-gray-800 border-b border-gray-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-indigo-400" />
          <span className="font-medium text-white">{poll.question}</span>
        </div>
        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
          {getPollTimeRemaining(poll)}
        </span>
      </div>
      
      <div className="p-3 space-y-2">
        {poll.options.map(option => {
          const hasVoted = userVotes[poll.id] === option.id;
          const percentage = getOptionPercentage(poll, option.id);
          const votes = poll.results?.[option.id] || 0;
          
          return (
            <div key={option.id} className="relative">
              {/* Background progress bar */}
              {(poll.isEnded || userVotes[poll.id]) && (
                <div 
                  className={`absolute left-0 top-0 bottom-0 bg-opacity-20 ${
                    hasVoted ? 'bg-indigo-500' : 'bg-gray-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}
              
              <button
                onClick={() => handlePollVote(poll.id, option.id)}
                disabled={!!userVotes[poll.id] || poll.isEnded}
                className={`relative w-full text-left py-2 px-3 rounded ${
                  hasVoted
                    ? 'bg-indigo-600 text-white'
                    : userVotes[poll.id] || poll.isEnded
                    ? 'bg-gray-600 text-gray-300'
                    : 'bg-gray-600 hover:bg-gray-500 text-white'
                } transition-colors flex items-center justify-between`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {hasVoted && <Check size={16} className="flex-shrink-0" />}
                  <span className="truncate">{option.text}</span>
                </div>
                
                {(poll.isEnded || userVotes[poll.id]) && (
                  <div className="text-xs flex items-center gap-1">
                    <span className="font-medium">{votes}</span>
                    <span className="text-gray-300">({Math.round(percentage)}%)</span>
                  </div>
                )}
              </button>
            </div>
          );
        })}
        
        <div className="text-xs text-gray-400 mt-2 flex justify-between">
          <span>
            {poll.totalVotes || 0} {poll.totalVotes === 1 ? 'vote' : 'votes'}
          </span>
          {userVotes[poll.id] && !poll.isEnded && (
            <span>You voted</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div 
      className={`flex flex-col bg-gray-800 rounded-lg overflow-hidden transition-all duration-300 ease-in-out ${
        isCollapsed ? 'h-[48px]' : 'h-full'
      }`}
    >
      <div 
        className="p-3 bg-gray-700 border-b border-gray-600 cursor-pointer select-none flex-shrink-0"
        onClick={handleToggleCollapse}
      >
        <h3 className="font-medium text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Live Chat</span>
            {!isCollapsed && messages.length > 0 && (
              <span className="text-xs bg-amber-600 px-1.5 py-0.5 rounded-full">
                {messages.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isConnecting && <span className="mr-2 text-xs text-gray-300">Connecting...</span>}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReconnect();
                  }}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                >
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>Reconnect</span>
                </button>
              )}
              {isCollapsed ? (
                <ChevronUp size={18} className="text-gray-400" />
              ) : (
                <ChevronDown size={18} className="text-gray-400" />
              )}
            </div>
          </div>
        </h3>
      </div>
      
      <div 
        className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? 'h-0' : 'h-[calc(100%-48px)]'
        }`}
      >
        <div 
          ref={chatContainerRef} 
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-md p-3 text-white text-sm">
              {error}
            </div>
          )}
          
          {!error && messages.length === 0 && activePolls.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet</p>
              <p className="text-sm">Be the first to say hello!</p>
            </div>
          ) : (
            <>
              {/* Active polls */}
              {activePolls.length > 0 && (
                <div className="mb-4 space-y-4">
                  {activePolls.map(renderPoll)}
                </div>
              )}
              
              {/* Chat messages */}
              {messages.map((message) => (
                <div key={message.id} className="flex flex-col">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-500 font-bold">
                      {message.user[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white">
                          {message.user}
                        </span>
                        {message.isHost && (
                          <span className="text-xs bg-amber-600 text-white px-1.5 py-0.5 rounded">
                            HOST
                          </span>
                        )}
                        <span className="text-gray-400 text-xs">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-gray-300 break-words mt-1">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          <div ref={messagesEndRef} className="h-0 w-0 invisible" />
        </div>
        
        <form onSubmit={handleSendMessage} className={`p-3 border-t border-gray-700 bg-gray-800 transition-all duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
          <div className="relative flex h-10">
            <div className="flex-shrink-0 flex items-stretch h-full">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="bg-gray-700 text-amber-500 hover:text-amber-400 rounded-l-md px-3 flex items-center justify-center focus:outline-none h-full w-10"
                disabled={isCollapsed}
              >
                <Smile size={18} />
              </button>
            </div>
            
            <input
              type="text"
              placeholder={isConnected ? "Type a message..." : "Connecting to chat..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!isConnected || isCollapsed}
              className="flex-1 bg-gray-700 text-white border-none px-3 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed h-full min-w-0"
              style={{ lineHeight: '40px' }}
            />
            
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected || isCollapsed}
              className="flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white rounded-r-md w-12 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed h-full"
            >
              <Send size={18} />
            </button>
            
            {showEmojiPicker && !isCollapsed && (
              <div 
                ref={emojiPickerRef} 
                className="absolute bottom-16 left-0 z-20 shadow-xl rounded-lg"
                style={{ minWidth: '320px', maxWidth: '90vw' }}
              >
                <Picker 
                  data={data} 
                  onEmojiSelect={handleEmojiSelect}
                  theme="dark"
                />
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
} 