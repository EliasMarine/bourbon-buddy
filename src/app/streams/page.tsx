'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSupabaseSession, useSession } from '@/hooks/use-supabase-session';
import Link from 'next/link';
import Image from 'next/image';
import { 
  PlusCircle, Users, Calendar, Award, Clock, Info, GlassWater, 
  Star, Trash2, FileVideo, Video, PlayCircle, Tv, EyeIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MuxThumbnail } from '@/components/ui/mux-player';
import { useVideoStatus, VideoType } from '@/hooks/use-video-status';

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

interface Video {
  id: string;
  title: string;
  description: string | null;
  status: string;
  muxUploadId: string | null;
  muxAssetId: string | null;
  muxPlaybackId: string | null;
  duration: number | null;
  aspectRatio: string | null;
  thumbnailTime: number | null;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  publiclyListed: boolean;
  views: number;
  featured?: boolean;
  user?: {
    name: string;
    avatar?: string;
  };
}

export default function StreamsPage() {
  const { data: session } = useSession();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [filter, setFilter] = useState<'all' | 'live'>('all');
  const [view, setView] = useState<'live' | 'recorded'>('live');
  const [userName, setUserName] = useState<string>('');
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const cleanupRef = useRef(false);
  const [cleanupCompleted, setCleanupCompleted] = useState(false);
  const firstLoadRef = useRef(true);
  
  // Use our custom hook to manage video status
  const {
    videoStatuses,
    isCheckingStatus,
    manualAssetId,
    showManualAssetInput,
    hasJustBecomeReady,
    checkVideoStatus,
    setMuxAssetId,
    setManualAssetId,
    setShowManualAssetInput
  } = useVideoStatus(videos as VideoType[]);

  useEffect(() => {
    // Only load data on first render
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      fetchStreams();
      fetchVideos();
      
      // Set user name from session if available
      if (session?.user?.name) {
        setUserName(session.user.name);
      }

      // Trigger cleanup only once when page loads
      if (!cleanupRef.current) {
        triggerCleanup();
        cleanupRef.current = true;
      }
    }
  }, [session]); // Only depend on session, not other state that might change
  
  const fetchStreams = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/streams');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch streams: ${response.status}`);
      }
      
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

  const fetchVideos = async () => {
    try {
      setIsLoadingVideos(true);
      const response = await fetch('/api/videos');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add featured property and manually create user data from userId
      const enhancedVideos = (data.videos || []).map((video: Video, index: number) => ({
        ...video,
        featured: index === 0 || index === 3, // Mark a couple of videos as featured for demo
        user: {
          name: video.userId ? (video.userId.includes('@') ? video.userId.split('@')[0] : video.userId) : 'Anonymous User',
          avatar: undefined
        }
      }));
      
      setVideos(enhancedVideos);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      // Set some fallback data if API fails
      setVideos([]);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const triggerCleanup = async () => {
    if (cleanupRef.current) return; // Skip if already triggered

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
      
      setCleanupCompleted(true);
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

  // Skeleton UI specifically for video cards
  const VideoSkeletonCard = () => (
    <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/90 rounded-xl overflow-hidden border border-gray-700 backdrop-blur-sm animate-pulse">
      <div className="relative aspect-video bg-gray-800">
        {/* Simulated status bar */}
        <div className="absolute top-0 left-0 right-0 p-2">
          <div className="h-7 bg-amber-600/70 rounded-md w-full"></div>
        </div>
        
        {/* Simulated duration badge */}
        <div className="absolute bottom-2 right-2">
          <div className="h-5 w-12 bg-black/60 rounded"></div>
        </div>
      </div>
      <div className="p-5 md:p-6">
        <div className="h-6 bg-gray-700 rounded-md w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-700/50 rounded-md w-full mb-2"></div>
        <div className="h-4 bg-gray-700/50 rounded-md w-2/3 mb-4"></div>
        
        <div className="h-6 w-24 bg-gray-800 rounded-full mb-4"></div>
        
        <div className="flex items-center gap-2 mt-6 pt-3 border-t border-gray-700/30">
          <div className="w-8 h-8 rounded-full bg-gray-700"></div>
          <div className="h-3 bg-gray-700 rounded-md w-24"></div>
          <div className="ml-auto h-3 bg-gray-700 rounded-md w-16"></div>
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
              {view === 'live' ? (
                <Link
                  href="/streams/create"
                  className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-amber-900/20 whitespace-nowrap text-sm md:text-base self-center md:self-start"
                >
                  <PlusCircle size={16} className="md:w-[18px] md:h-[18px]" />
                  <span>Start a Tasting</span>
                </Link>
              ) : (
                <Link
                  href="/upload"
                  className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-amber-900/20 whitespace-nowrap text-sm md:text-base self-center md:self-start"
                >
                  <PlusCircle size={16} className="md:w-[18px] md:h-[18px]" />
                  <span>Upload Video</span>
                </Link>
              )}
              
              {session && view === 'live' && (
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

        {/* Main tabs for Live vs Recorded Tastings */}
        <div className="mb-8">
          <div className="border-b border-gray-700 flex">
            <button
              onClick={() => setView('live')}
              className={`py-3 px-5 text-sm md:text-base font-medium flex items-center gap-2 transition-all relative ${
                view === 'live'
                  ? 'text-amber-500 border-b-2 border-amber-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Tv size={16} className="md:w-[18px] md:h-[18px]" />
              Live Tastings
              {streams.filter(s => s.isLive).length > 0 && (
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse absolute top-2 right-3"></div>
              )}
            </button>
            <button
              onClick={() => setView('recorded')}
              className={`py-3 px-5 text-sm md:text-base font-medium flex items-center gap-2 transition-all ${
                view === 'recorded'
                  ? 'text-amber-500 border-b-2 border-amber-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <PlayCircle size={16} className="md:w-[18px] md:h-[18px]" />
              Recorded Tastings
            </button>
          </div>
        </div>

        {/* Content section - conditionally render based on the selected view */}
        {view === 'live' ? (
          /* Live Tastings Content */
          <>
            {/* Only show Live filters when in live view */}
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
          </>
        ) : (
          /* Recorded Videos Content */
          <>
            {isLoadingVideos ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[...Array(6)].map((_, i) => (
                  <VideoSkeletonCard key={i} />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <div className="bg-gradient-to-b from-gray-800/60 to-gray-900/70 rounded-2xl p-8 md:p-10 text-center backdrop-blur-sm border border-gray-700 shadow-xl shadow-black/10">
                <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-full bg-gray-700/70 flex items-center justify-center p-4 md:p-5">
                  <FileVideo size={36} className="text-amber-500 md:w-10 md:h-10" />
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-white mb-3">No recorded tastings yet</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto text-sm md:text-base">Share your bourbon experiences with the community by recording a tasting session.</p>
                {session ? (
                  <Link href="/upload" className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-5 py-2 md:px-6 md:py-3 rounded-lg hover:from-amber-700 hover:to-amber-800 inline-block transition-all shadow-lg shadow-amber-900/20 text-sm md:text-base">
                    Upload Your First Tasting
                  </Link>
                ) : (
                  <div className="space-y-4">
                    <p className="text-amber-400 font-medium text-sm md:text-base">Sign in to upload your own tastings</p>
                    <Link href="/api/auth/signin" className="bg-gray-700 text-white px-5 py-2 md:px-6 md:py-3 rounded-lg hover:bg-gray-600 inline-block transition-colors text-sm md:text-base">
                      Sign In
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className="bg-gradient-to-b from-gray-800/90 to-gray-900/90 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-700 hover:border-amber-500/40 backdrop-blur-sm group"
                    >
                      <Link href={`/watch/${video.id}`} className="block">
                        <div className="relative">
                          {/* Manual asset ID input - shown when the user wants to manually set the MUX asset ID */}
                          {showManualAssetInput === video.id && (
                            <div 
                              className="absolute inset-0 z-30 bg-black/80 backdrop-blur flex items-center justify-center p-4"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <div className="bg-gray-800 p-4 rounded-lg w-full max-w-sm">
                                <h3 className="text-white font-medium mb-2">Set MUX Asset ID</h3>
                                <p className="text-gray-300 text-sm mb-3">Enter the MUX asset ID to link to this video:</p>
                                <input
                                  type="text"
                                  value={manualAssetId}
                                  onChange={(e) => setManualAssetId(e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 mb-3"
                                  placeholder="e.g. TF8002bRfe02BoyFDcgeG9kTro9f17OwNLd8m4SjgOZBY"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setShowManualAssetInput(null);
                                    }}
                                    className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setMuxAssetId(video.id, manualAssetId);
                                      setShowManualAssetInput(null);
                                      setManualAssetId("");
                                      // Trigger a fetch to update the videos list
                                      setTimeout(() => fetchVideos(), 1000);
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Use enhanced MuxThumbnail component */}
                          {video.muxPlaybackId ? (
                            <MuxThumbnail 
                              playbackId={video.muxPlaybackId} 
                              time={video.thumbnailTime || 0}
                              status={hasJustBecomeReady(video.id, video.status) ? 'ready-new' : (videoStatuses[video.id] || video.status)}
                              duration={video.duration}
                              isCheckingStatus={isCheckingStatus[video.id]}
                              onCheckStatus={() => checkVideoStatus(video.id, 'processing')}
                              onManualAsset={() => setShowManualAssetInput(video.id)}
                              isFeatured={video.featured}
                            />
                          ) : (
                            <div className="aspect-video bg-gray-800/80 flex items-center justify-center">
                              <Video className="w-16 h-16 text-gray-600" />
                            </div>
                          )}
                        </div>
                        
                        <div className="p-5 md:p-6">
                          {/* Title and description */}
                          <h3 className="font-semibold text-white text-lg md:text-xl mb-2 group-hover:text-amber-500 transition-colors line-clamp-1">{video.title}</h3>
                          
                          {video.description && (
                            <p className="text-gray-400 text-sm mb-4 line-clamp-2">{video.description}</p>
                          )}
                          
                          {/* Views badge - if applicable */}
                          {video.views > 100 && (
                            <div className="mb-4">
                              <span className="inline-flex items-center gap-1.5 bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-300">
                                <EyeIcon size={12} className="text-gray-400" />
                                {video.views} views
                              </span>
                            </div>
                          )}
                          
                          {/* User and date */}
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-700/50">
                            <div className="w-8 h-8 relative rounded-full overflow-hidden bg-gray-700 ring-1 ring-amber-500/20">
                              {video.user?.avatar ? (
                                <Image
                                  src={video.user.avatar}
                                  alt={video.user.name || 'User'}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-amber-600 text-white font-medium">
                                  {video.user?.name?.[0] || '?'}
                                </div>
                              )}
                            </div>
                            <span className="text-sm text-gray-300 font-medium">
                              {video.user?.name || 'Anonymous User'}
                            </span>
                            <span className="text-xs text-gray-500 ml-auto">
                              {new Date(video.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        
        {/* Sign in CTA - show at bottom for both views */}
        {!session && (
          <div className="mt-10 max-w-xl mx-auto mb-10">
            <Link href="/api/auth/signin" className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-3 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 w-full font-medium">
              <PlusCircle size={18} />
              <span>Sign in to Create a Tasting</span>
            </Link>
            <p className="text-sm text-gray-400 mt-2 text-center">Join the community and start streaming</p>
          </div>
        )}
      </div>
    </div>
  );
} 