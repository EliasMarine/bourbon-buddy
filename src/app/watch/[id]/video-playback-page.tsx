"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MuxPlayer } from '@/components/ui/mux-player'
import DeleteVideoButton from './DeleteVideoButton'
import VideoComments from '@/components/video-comments'
import { ErrorBoundary } from 'react-error-boundary'

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
}

/**
 * Helper function to check if a playback ID is a placeholder
 */
function isPlaceholderId(playbackId: string | null): boolean {
  return !!playbackId && playbackId.startsWith('placeholder-')
}

/**
 * VideoPlaybackPage handles playback errors and displays the video and comments.
 * If a playback error occurs, a friendly error UI is shown with a Go Back button.
 */
export default function VideoPlaybackPage({ video, comments, formattedDate }: VideoPlaybackPageProps) {
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const router = useRouter()
  
  // Check if this is a placeholder ID
  const isPlaceholder = isPlaceholderId(video.muxPlaybackId)
  
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
          <div className="flex justify-end mb-4">
            <DeleteVideoButton id={video.id} />
          </div>
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
          <div className="mt-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4 text-zinc-400 border-b border-zinc-700/40 pb-4">
              <time className="flex items-center">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formattedDate}
              </time>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {video.views || 0} views
              </span>
            </div>
            {video.description && (
              <div className="mb-8 bg-zinc-800/30 backdrop-blur-sm rounded-xl p-5 border border-zinc-700/40">
                <h2 className="text-xl font-semibold mb-3 text-white flex items-center">
                  <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Description
                </h2>
                <p className="text-zinc-300 whitespace-pre-wrap">{video.description}</p>
              </div>
            )}
            {/* Comments Section */}
            <div className="mt-8 bg-zinc-800/30 backdrop-blur-sm rounded-xl p-5 border border-zinc-700/40">
              <h2 className="text-xl font-semibold mb-4 text-white flex items-center">
                <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Comments
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
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 text-white min-h-screen">
      <div className="px-4 py-6 md:py-8 max-w-7xl mx-auto">
        <div className="flex justify-end mb-4">
          <DeleteVideoButton id={video.id} />
        </div>
        
        {/* Video player section with title above it */}
        <div className="w-full max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-3 text-white">{video.title}</h1>
          
          {/* MuxPlayer with a proper container */}
          {video.muxPlaybackId && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-xl">
              <MuxPlayer
                playbackId={video.muxPlaybackId}
                accentColor="#d97706" // Amber-600
                metadataVideoTitle={video.title}
                onError={(error) => {
                  console.error('MuxPlayer error:', error);
                  setPlaybackError('Playback error: ' + (error?.message || 'Unknown error'));
                }}
                className="w-full h-full"
                hideTryFallbackButton={true}
              />
            </div>
          )}
        </div>
        
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6 text-zinc-400 border-b border-zinc-700/40 pb-4">
            <time className="flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formattedDate}
            </time>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {video.views || 0} views
            </span>
          </div>
          {video.description && (
            <div className="mb-8 bg-zinc-800/30 backdrop-blur-sm rounded-xl p-5 border border-zinc-700/40">
              <h2 className="text-xl font-semibold mb-3 text-white flex items-center">
                <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Description
              </h2>
              <p className="text-zinc-300 whitespace-pre-wrap">{video.description}</p>
            </div>
          )}
          {/* Comments Section */}
          <div className="mt-8 bg-zinc-800/30 backdrop-blur-sm rounded-xl p-5 border border-zinc-700/40">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center">
              <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Comments
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
      </div>
    </div>
  )
} 