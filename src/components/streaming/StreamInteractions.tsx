'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Share2, Flag, Heart, Star, DollarSign, Copy, Twitter, Facebook, MessageCircle, Link2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface StreamInteractionsProps {
  streamId: string;
  hostId: string;
  initialLikes?: number;
  initialIsLiked?: boolean;
  initialIsSubscribed?: boolean;
}

export default function StreamInteractions({
  streamId,
  hostId,
  initialLikes = 0,
  initialIsLiked = false,
  initialIsSubscribed = false,
}: StreamInteractionsProps) {
  const { data: session } = useSession();
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isSubscribed, setIsSubscribed] = useState(initialIsSubscribed);
  const [isLoading, setIsLoading] = useState(false);
  const [showTipDialog, setShowTipDialog] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.user) {
      // Fetch initial states
      fetchInteractionStates();
    }
  }, [session]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInteractionStates = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/interactions`);
      const data = await response.json();
      setLikes(data.likes);
      setIsLiked(data.isLiked);
      setIsSubscribed(data.isSubscribed);
    } catch (error) {
      console.error('Failed to fetch interaction states:', error);
    }
  };

  const handleLike = async () => {
    if (!session) {
      toast.error('Please sign in to like streams');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/streams/${streamId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to like stream');

      const data = await response.json();
      setLikes(data.likes);
      setIsLiked(data.isLiked);
      toast.success(data.isLiked ? 'Stream liked!' : 'Like removed');
    } catch (error) {
      console.error('Failed to like stream:', error);
      toast.error('Failed to like stream');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!session) {
      toast.error('Please sign in to subscribe');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/streams/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hostId }),
      });

      if (!response.ok) throw new Error('Failed to subscribe');

      const data = await response.json();
      setIsSubscribed(data.isSubscribed);
      toast.success(data.isSubscribed ? 'Subscribed successfully!' : 'Unsubscribed successfully');
    } catch (error) {
      console.error('Failed to subscribe:', error);
      toast.error('Failed to subscribe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (method: 'copy' | 'twitter' | 'facebook' | 'whatsapp') => {
    const streamUrl = window.location.href;
    const streamTitle = 'Check out this bourbon tasting stream!'; // You can make this dynamic if needed
    
    try {
      switch (method) {
        case 'copy':
          await navigator.clipboard.writeText(streamUrl);
          toast.success('Stream link copied to clipboard!');
          break;
          
        case 'twitter':
          const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(streamUrl)}&text=${encodeURIComponent(streamTitle)}`;
          window.open(twitterUrl, '_blank', 'noopener,noreferrer');
          break;
          
        case 'facebook':
          const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(streamUrl)}`;
          window.open(facebookUrl, '_blank', 'noopener,noreferrer');
          break;
          
        case 'whatsapp':
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${streamTitle} ${streamUrl}`)}`;
          window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
          break;
      }
    } catch (error) {
      console.error('Failed to share:', error);
      toast.error('Failed to share stream');
    } finally {
      setShowShareMenu(false);
    }
  };

  const handleReport = async () => {
    if (!session) {
      toast.error('Please sign in to report streams');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/streams/${streamId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to report stream');

      toast.success('Stream reported. Thank you for helping keep our community safe.');
    } catch (error) {
      console.error('Failed to report stream:', error);
      toast.error('Failed to report stream');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTip = async () => {
    if (!session) {
      toast.error('Please sign in to send tips');
      return;
    }

    if (hostId === session?.user?.id) {
      toast.error('You cannot tip your own stream');
      return;
    }

    setShowTipDialog(true);
  };

  const handleTipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tipAmount || isNaN(Number(tipAmount)) || Number(tipAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/streams/${streamId}/tip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(tipAmount),
          message: tipMessage || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to send tip');

      const data = await response.json();
      toast.success('Tip sent successfully!');
      setShowTipDialog(false);
      setTipAmount('');
      setTipMessage('');
    } catch (error) {
      console.error('Failed to send tip:', error);
      toast.error('Failed to send tip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleLike}
          disabled={isLoading}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
            isLiked
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Heart size={16} className={isLiked ? 'fill-current' : ''} />
          <span>{likes}</span>
        </button>

        <button
          onClick={handleSubscribe}
          disabled={isLoading || hostId === session?.user?.id}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
            isSubscribed
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Star size={16} className={isSubscribed ? 'fill-current' : ''} />
          <span>{isSubscribed ? 'Subscribed' : 'Subscribe'}</span>
        </button>

        <button
          onClick={handleTip}
          disabled={isLoading || hostId === session?.user?.id}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all"
        >
          <DollarSign size={16} />
          <span>Tip</span>
        </button>

        <div className="relative" ref={shareMenuRef}>
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all"
          >
            <Share2 size={16} />
            <span>Share</span>
          </button>

          {showShareMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg bg-gray-900 shadow-lg border border-gray-700 py-1 z-50">
              <button
                onClick={() => handleShare('copy')}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <Copy size={14} />
                <span>Copy Link</span>
              </button>
              <button
                onClick={() => handleShare('twitter')}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <Twitter size={14} />
                <span>Share on Twitter</span>
              </button>
              <button
                onClick={() => handleShare('facebook')}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <Facebook size={14} />
                <span>Share on Facebook</span>
              </button>
              <button
                onClick={() => handleShare('whatsapp')}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <MessageCircle size={14} />
                <span>Share on WhatsApp</span>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleReport}
          disabled={isLoading || hostId === session?.user?.id}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-all"
        >
          <Flag size={16} />
          <span>Report</span>
        </button>
      </div>

      {showTipDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Send a Tip</h3>
            <form onSubmit={handleTipSubmit} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  id="amount"
                  min="1"
                  step="1"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                  Message (optional)
                </label>
                <textarea
                  id="message"
                  value={tipMessage}
                  onChange={(e) => setTipMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Add a message..."
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTipDialog(false)}
                  className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Sending...' : 'Send Tip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 