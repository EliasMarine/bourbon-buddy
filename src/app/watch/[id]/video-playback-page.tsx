"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import MuxPlayer from '@/components/ui/mux-player'
import DeleteVideoButton from './DeleteVideoButton'
import VideoComments from '@/components/video-comments'
import { ErrorBoundary } from 'react-error-boundary'
import { CalendarDays, Eye, ThumbsUp, Share2, Save, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react'

// Video and Comment interfaces should match the main page
interface Video {
  id: string
  title: string
  description: string | null
  status: string
  muxUploadId: string | null
  muxAssetId: string | null
  muxPlaybackId: string | null
  duration: number | null
  aspectRatio: string | null
  thumbnailTime: number | null
  userId: string | null
  createdAt: Date
  updatedAt: Date
  publiclyListed: boolean
  views: number
  user?: {
    name: string | null
    image: string | null
  }
}

interface Comment {
  id: string
  content: string
  userId: string
  videoId: string
  createdAt: Date
  user: {
    name: string | null
    image: string | null
  }
}

interface VideoPlaybackPageProps {
  video: Video
  comments: Comment[]
  formattedDate: string
  relatedVideos?: Video[] // For showing other videos from the same user
}

/**
 * Helper function to check if a playback ID is a placeholder
 */
function isPlaceholderId(playbackId: string | null): boolean {
  return !!playbackId && playbackId.startsWith('placeholder-')
}

/**
 * VideoPlaybackPage follows YouTube's design pattern with separate player and content areas
 */
export default function VideoPlaybackPage({ video, comments, formattedDate, relatedVideos = [] }: VideoPlaybackPageProps) {
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [userVideos, setUserVideos] = useState<Video[]>([])
  const [isLoadingUserVideos, setIsLoadingUserVideos] = useState(true)
  const router = useRouter()
  
  // Check if this is a placeholder ID
  const isPlaceholder = isPlaceholderId(video.muxPlaybackId)
  
  // Fetch more videos from the same user
  useEffect(() => {
    async function fetchUserVideos() {
      if (!video.userId) {
        setIsLoadingUserVideos(false)
        return
      }
      
      try {
        const response = await fetch(`/api/videos?userId=${video.userId}&limit=4`)
        if (response.ok) {
          const data = await response.json()
          // Filter out the current video
          const otherVideos = data.videos?.filter((v: Video) => v.id !== video.id) || []
          setUserVideos(otherVideos)
        }
      } catch (error) {
        console.error('Failed to fetch user videos:', error)
      } finally {
        setIsLoadingUserVideos(false)
      }
    }
    
    fetchUserVideos()
  }, [video.userId, video.id])
  
  if (playbackError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gradient-to-b from-zinc-900 to-zinc-950 text-white px-4">
        <div className="w-20 h-20 rounded-full bg-red-900/30 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Playback Error</h2>
        <p className="text-zinc-300 text-center max-w-md mb-6">Sorry, there was a problem playing this video. Please try again later.</p>
        <button
          className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
          onClick={() => router.push('/past-tastings')}
        >
          Go Back to Past Tastings
        </button>
      </div>
    )
  }
  
  // Display placeholder message instead of attempting to load a placeholder video ID
  if (isPlaceholder) {
    return (
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 text-white min-h-screen">
        <div className="px-4 py-6 md:py-8 max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white">{video.title}</h1>
          </div>
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-zinc-800/60 border-zinc-700/60 border rounded-xl p-8 flex flex-col items-center justify-center aspect-video">
              <svg className="w-16 h-16 text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h2 className="text-xl font-bold text-amber-400 mb-2">Video Preview Only</h2>
              <p className="text-zinc-300 text-center max-w-md mb-4">
                This video is currently in preview mode. The actual video content is not available for playback yet.
              </p>
              <p className="text-zinc-400 text-sm text-center">
                This happens when the video metadata exists but the actual video content hasn't been processed or uploaded yet.
              </p>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <DeleteVideoButton id={video.id} />
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-zinc-950 text-white min-h-screen">
      {/* Main content layout */}
      <div className="max-w-[2000px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-12 gap-6 px-4 lg:px-6">
          {/* Left column (video player + primary info) - takes 8/12 on xl screens */}
          <div className="xl:col-span-8 lg:col-span-2">
            {/* Video player area */}
            <div className="w-full bg-black">
              {video.muxPlaybackId && (
                <div className="relative w-full aspect-video">
                  <MuxPlayer
                    playbackId={video.muxPlaybackId}
                    accentColor="#d97706" // Amber-600
                    metadataVideoTitle={video.title}
                    metadataViewerUserId={video.userId || "anonymous"}
                    autoPlay="muted"
                    playsInline={true}
                    loop={false}
                    streamType="on-demand"
                    onError={(error) => {
                      console.error('MuxPlayer error:', error);
                      setPlaybackError('Playback error: ' + (error?.message || 'Unknown error'));
                    }}
                    className="w-full h-full"
                    hideControls={false}
                  />
                </div>
              )}
            </div>
            
            {/* Video title area */}
            <div className="mt-3 mb-4">
              <h1 className="text-xl md:text-2xl font-semibold text-white">{video.title}</h1>
            </div>
            
            {/* Video stats and actions bar */}
            <div className="flex flex-wrap justify-between items-center py-2 border-b border-zinc-800 mb-4">
              <div className="flex items-center text-zinc-400 space-x-4">
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-1.5" />
                  <span>{video.views || 0} views</span>
                </div>
                <div className="flex items-center">
                  <CalendarDays className="w-4 h-4 mr-1.5" />
                  <span>{formattedDate}</span>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center space-x-3 mt-2 sm:mt-0">
                <button className="flex items-center space-x-1 bg-zinc-800 hover:bg-zinc-700 rounded-full px-4 py-2 transition-colors">
                  <ThumbsUp className="w-5 h-5" />
                  <span>Like</span>
                </button>
                <button className="flex items-center space-x-1 bg-zinc-800 hover:bg-zinc-700 rounded-full px-4 py-2 transition-colors">
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                </button>
                <button className="flex items-center space-x-1 bg-zinc-800 hover:bg-zinc-700 rounded-full px-4 py-2 transition-colors">
                  <Save className="w-5 h-5" />
                  <span>Save</span>
                </button>
                <button className="bg-zinc-800 hover:bg-zinc-700 rounded-full p-2 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Channel info and description */}
            <div className="mb-6 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              {/* Channel info */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-amber-700 mr-3 flex items-center justify-center">
                    {video.user?.image ? (
                      <Image 
                        src={video.user.image} 
                        alt={video.user?.name || 'Channel owner'}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="text-white font-semibold">
                        {video.user?.name ? video.user.name[0].toUpperCase() : '?'}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{video.user?.name || 'Unknown User'}</div>
                  </div>
                </div>
                
                <DeleteVideoButton id={video.id} />
              </div>
              
              {/* Description */}
              {video.description && (
                <div className="mt-2">
                  <div 
                    className={`text-zinc-300 whitespace-pre-wrap ${!isDescriptionExpanded && 'line-clamp-3'}`}
                  >
                    {video.description}
                  </div>
                  
                  {/* Show more/less button */}
                  {video.description.split('\n').length > 3 && (
                    <button 
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="text-zinc-400 hover:text-white text-sm font-medium mt-2 flex items-center"
                    >
                      {isDescriptionExpanded ? (
                        <>
                          <span>Show less</span>
                          <ChevronUp className="ml-1 w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <span>Show more</span>
                          <ChevronDown className="ml-1 w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Comments Section */}
            <div className="mt-6 mb-10">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span>Comments</span>
                <span className="text-zinc-400 ml-2 text-sm">({comments.length})</span>
              </h2>
              
              <ErrorBoundary
                fallback={
                  <div className="bg-amber-900/30 border-l-4 border-amber-500 p-4 rounded-md">
                    <p className="text-amber-400 font-medium">Comments could not be loaded.</p>
                    <p className="text-amber-300/70 text-sm mt-1">Sign in to view and post comments.</p>
                  </div>
                }
              >
                <VideoComments videoId={video.id} initialComments={comments} />
              </ErrorBoundary>
            </div>
          </div>
          
          {/* Right column (related videos) - takes 4/12 on xl screens */}
          <div className="xl:col-span-4 lg:col-span-1">
            <div className="sticky top-20">
              <h2 className="text-lg font-semibold mb-4">More from this user</h2>
              
              {isLoadingUserVideos ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-zinc-800/50 rounded-lg h-24 animate-pulse"></div>
                  ))}
                </div>
              ) : userVideos.length > 0 ? (
                <div className="space-y-4">
                  {userVideos.map((relatedVideo) => (
                    <Link 
                      href={`/watch/${relatedVideo.id}`} 
                      key={relatedVideo.id}
                      className="flex gap-2 group"
                    >
                      <div className="flex-shrink-0 w-40 h-24 bg-zinc-800 rounded-lg overflow-hidden">
                        {relatedVideo.muxPlaybackId && !isPlaceholderId(relatedVideo.muxPlaybackId) ? (
                          <img
                            src={`https://image.mux.com/${relatedVideo.muxPlaybackId}/thumbnail.jpg?time=0&width=320`}
                            alt={relatedVideo.title}
                            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-zinc-800">
                            <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        
                        {/* Duration if available */}
                        {relatedVideo.duration && (
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                            {formatDuration(relatedVideo.duration)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white line-clamp-2 group-hover:text-amber-400 transition-colors">
                          {relatedVideo.title}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1">
                          {relatedVideo.views || 0} views
                        </p>
                        <p className="text-xs text-zinc-400">
                          {formatDate(relatedVideo.createdAt)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-900/50 rounded-xl p-4 text-center">
                  <p className="text-zinc-400">No other videos from this user</p>
                </div>
              )}
              
              {/* More from Past Tastings link */}
              <div className="mt-6">
                <Link
                  href="/past-tastings"
                  className="block text-center w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-3 transition-colors font-medium"
                >
                  Browse all Past Tastings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function formatDuration(durationInSeconds: number): string {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = Math.floor(durationInSeconds % 60);
  
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} weeks ago`;
  } else if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)} months ago`;
  } else {
    return `${Math.floor(diffDays / 365)} years ago`;
  }
} 