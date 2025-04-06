'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { PlusCircle, Users, Calendar, Award, Clock, Info, GlassWater, Star, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Stream {
  id: string;
  title: string;
  hostId: string;
  host: {
    name: string;
    avatar?: string;
  };
  spiritId?: string;
  spirit?: {
    name: string;
    type: string;
    brand: string;
  };
  isLive: boolean;
  startedAt: string;
  featured?: boolean;
}

export default function StreamsPage() {
  const { data: session } = useSession();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'live'>('all');
  const [userName, setUserName] = useState<string>('');
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    fetchStreams();
    
    // Set user name from session if available
    if (session?.user?.name) {
      setUserName(session.user.name);
    }

    // Trigger cleanup when page loads
    triggerCleanup();
  }, [session]);

  const fetchStreams = async () => {
    try {
      const response = await fetch('/api/streams');
      const data = await response.json();
      
      // For demonstration, mark some streams as featured
      const streamsWithFeatured = (data.streams || []).map((stream: Stream, index: number) => ({
        ...stream,
        featured: index === 0 || index === 2, // Mark a couple of streams as featured for demo
      }));
      
      setStreams(streamsWithFeatured);
    } catch (error) {
      console.error('Failed to fetch streams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerCleanup = async () => {
    try {
      const response = await fetch('/api/streams/cleanup', {
        method: 'POST'
      });
      
      if (!response.ok) {
        console.error('Failed to trigger cleanup');
        return;
      }
      
      const data = await response.json();
      if (data.staleLiveCount > 0 || data.deletedCount > 0) {
        // Refresh the streams list if any cleanup was performed
        fetchStreams();
      }
    } catch (error) {
      console.error('Error triggering cleanup:', error);
    }
  };

  const filteredStreams = filter === 'all' ? streams : streams.filter(stream => stream.isLive);
  const liveCount = streams.filter(stream => stream.isLive).length;

  // Format the started time to a readable format
  const formatStartedTime = (startTime: string) => {
    const date = new Date(startTime);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  // Skeleton UI for loading state
  const SkeletonCard = () => (
    <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/90 rounded-2xl overflow-hidden border border-gray-700 backdrop-blur-sm animate-pulse">
      <div className="h-48 bg-gray-800"></div>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-700"></div>
          <div>
            <div className="h-5 bg-gray-700 rounded w-36 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-28"></div>
          </div>
        </div>
        <div className="h-24 bg-gray-800 rounded-xl mb-4"></div>
        <div className="flex justify-between items-center mt-6">
          <div className="h-3 bg-gray-700 rounded w-24"></div>
          <div className="h-8 bg-amber-700/50 rounded w-20"></div>
        </div>
      </div>
    </div>
  );

  const cleanupStaleStreams = async () => {
    try {
      setIsCleaningUp(true);
      const response = await fetch('/api/streams', {
        method: 'PATCH'
      });
      
      if (!response.ok) {
        throw new Error('Failed to cleanup streams');
      }
      
      const data = await response.json();
      if (data.staleLiveCount > 0 || data.deletedCount > 0) {
        let message = [];
        if (data.staleLiveCount > 0) {
          message.push(`${data.staleLiveCount} stale streams marked inactive`);
        }
        if (data.deletedCount > 0) {
          message.push(`${data.deletedCount} old streams deleted`);
        }
        toast.success(message.join(', '));
      } else {
        toast.success('No streams needed cleanup');
      }
      
      // Refresh the streams list
      await fetchStreams();
    } catch (error) {
      console.error('Failed to cleanup streams:', error);
      toast.error('Failed to cleanup streams');
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-180px)]">
      <div className="container mx-auto px-4 py-8 max-w-7xl mt-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="max-w-full">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-2">
              <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">Bourbon</span> Tastings
            </h1>
            <p className="text-gray-300 max-w-2xl text-sm md:text-base">Join live bourbon tasting sessions with fellow enthusiasts or host your own tasting experience.</p>
          </div>
          {session && (
            <div className="flex items-center gap-2">
              <Link
                href="/streams/create"
                className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-amber-900/20 whitespace-nowrap text-sm md:text-base self-center md:self-start"
              >
                <PlusCircle size={16} className="md:w-[18px] md:h-[18px]" />
                <span>Start a Tasting</span>
              </Link>
              
              {session && (
                <button
                  onClick={cleanupStaleStreams}
                  disabled={isCleaningUp}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={20} className={isCleaningUp ? 'animate-spin' : ''} />
                  <span>Cleanup Stale</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-6">
          <button 
            onClick={() => setFilter('all')}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all text-sm md:text-base ${filter === 'all' 
              ? 'bg-amber-600 text-white' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            All Tastings
          </button>
          <button 
            onClick={() => setFilter('live')}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all flex items-center gap-2 text-sm md:text-base ${filter === 'live' 
              ? 'bg-amber-600 text-white' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Live Now ({isLoading ? '...' : liveCount})
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredStreams.length === 0 ? (
          <div className="bg-gradient-to-b from-gray-800/60 to-gray-900/70 rounded-2xl p-8 md:p-10 text-center backdrop-blur-sm border border-gray-700 shadow-xl shadow-black/10">
            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-full bg-gray-700/70 flex items-center justify-center p-4 md:p-5">
              <GlassWater size={36} className="text-amber-500 md:w-10 md:h-10" />
            </div>
            <h3 className="text-xl md:text-2xl font-semibold text-white mb-3">No {filter === 'live' ? 'live' : ''} tastings at the moment</h3>
            <p className="text-gray-300 mb-6 max-w-md mx-auto text-sm md:text-base">Check back later or start your own bourbon tasting session to share with the community.</p>
            {session ? (
              <Link href="/streams/create" className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-5 py-2 md:px-6 md:py-3 rounded-lg hover:from-amber-700 hover:to-amber-800 inline-block transition-all shadow-lg shadow-amber-900/20 text-sm md:text-base">
                Host Your First Tasting
              </Link>
            ) : (
              <div className="space-y-4">
                <p className="text-amber-400 font-medium text-sm md:text-base">Sign in to host your own tasting</p>
                <Link href="/api/auth/signin" className="bg-gray-700 text-white px-5 py-2 md:px-6 md:py-3 rounded-lg hover:bg-gray-600 inline-block transition-colors text-sm md:text-base">
                  Sign In
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredStreams.map((stream) => (
              <div
                key={stream.id}
                className={`bg-gradient-to-b from-gray-800/90 to-gray-900/90 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 border group ${stream.featured 
                  ? 'border-amber-500/40 ring-1 ring-amber-500/20' 
                  : 'border-gray-700 hover:border-amber-500/40'} backdrop-blur-sm`}
              >
                <div className="relative">
                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                    {stream.isLive && (
                      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-green-500/30">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm font-medium text-white">Live Now</span>
                      </div>
                    )}
                    {stream.featured && (
                      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-amber-500/30">
                        <Star size={12} className="text-amber-400" />
                        <span className="text-sm font-medium text-white">Featured</span>
                      </div>
                    )}
                  </div>
                  <div className={`h-48 flex items-center justify-center ${stream.featured 
                    ? 'bg-gradient-to-r from-amber-900/30 to-gray-900/30' 
                    : 'bg-gradient-to-r from-amber-900/20 to-gray-900/20'}`}>
                    {stream.spirit ? (
                      <div className="text-center p-4">
                        <div className={`inline-block p-3 rounded-full mb-2 ${stream.featured 
                          ? 'bg-amber-600/30' 
                          : 'bg-amber-600/20'}`}>
                          <Award size={28} className="text-amber-400" />
                        </div>
                        <p className="text-amber-300 font-medium">{stream.spirit.name}</p>
                        <p className="text-gray-400 text-sm">{stream.spirit.brand}</p>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <Clock size={32} className="text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">General Tasting</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-5 md:p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 relative rounded-full overflow-hidden bg-gray-700 ${stream.featured 
                      ? 'ring-2 ring-amber-500/40' 
                      : 'ring-2 ring-amber-500/20'}`}>
                      {stream.host.avatar ? (
                        <Image
                          src={stream.host.avatar}
                          alt={stream.host.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-amber-600 text-white font-medium">
                          {stream.host.name?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base md:text-lg">{stream.title}</h3>
                      <div className="flex flex-wrap items-center gap-1">
                        <p className="text-sm text-gray-300">Hosted by {stream.host.name}</p>
                        {stream.startedAt && (
                          <div className="flex items-center text-gray-400 text-xs">
                            <span className="mx-1">•</span>
                            <Calendar size={12} className="mr-1" />
                            Started {new Date(stream.startedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {stream.spirit && (
                    <div className="mb-4 bg-gray-800/80 p-3 md:p-4 rounded-xl border border-gray-700/50">
                      <p className="text-sm font-medium text-amber-400 mb-1">Featured Spirit:</p>
                      <p className="text-gray-200 font-medium">
                        {stream.spirit.name}
                      </p>
                      <p className="text-sm text-gray-400">by {stream.spirit.brand}</p>
                      <p className="text-xs text-gray-500 capitalize mt-1">{stream.spirit.type}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-6">
                    <div className="flex items-center">
                      <div className="flex items-center gap-1 text-gray-300">
                        <Users size={14} className="md:w-4 md:h-4" />
                        <span className="text-xs md:text-sm">12 Participants</span>
                      </div>
                    </div>
                    <Link
                      href={`/streams/${stream.id}`}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg ${stream.isLive 
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800' 
                        : 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800'} 
                      transition-all duration-300 text-xs md:text-sm font-medium flex-shrink-0`}
                    >
                      {stream.isLive ? 'Join Now' : 'View Details'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Remove the entire chat and demo area */}
        <div className="mt-10">
          {!session && (
            <div className="max-w-xl mx-auto mb-10">
              <Link href="/api/auth/signin" className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-3 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 w-full font-medium">
                <PlusCircle size={18} />
                <span>Sign in to Create a Tasting</span>
              </Link>
              <p className="text-sm text-gray-400 mt-2 text-center">Join the community and start streaming</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 