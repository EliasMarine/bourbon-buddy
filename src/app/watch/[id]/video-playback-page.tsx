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
      <div className="container mx-auto py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-24 h-24 rounded-full bg-red-900/20 flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-red-200 mb-2">Playback Error</h2>
        <p className="text-red-100 text-center max-w-md mb-4">Sorry, there was a problem playing this video. Please try again later.</p>
        <button
          className="mt-4 px-6 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-medium transition-colors"
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
      <div className="container mx-auto py-8">
        <DeleteVideoButton id={video.id} />
        <h1 className="text-2xl font-bold mb-4">{video.title}</h1>
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-amber-50 border-amber-200 border-2 rounded-lg p-8 flex flex-col items-center justify-center aspect-video">
            <svg className="w-16 h-16 text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-bold text-amber-800 mb-2">Video Preview Only</h2>
            <p className="text-amber-700 text-center max-w-md mb-4">
              This video is currently in preview mode. The actual video content is not available for playback yet.
            </p>
            <p className="text-amber-600 text-sm text-center">
              This happens when the video metadata exists but the actual video content hasn't been processed or uploaded yet.
            </p>
          </div>
        </div>
        <div className="mt-6 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <time className="text-gray-500">{formattedDate}</time>
            <span className="text-gray-500">{video.views || 0} views</span>
          </div>
          {video.description && (
            <>
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{video.description}</p>
            </>
          )}
          {/* Comments Section */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Comments</h2>
            <ErrorBoundary
              fallback={
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
                  <p className="text-amber-700">Comments could not be loaded.</p>
                  <p className="text-amber-600 text-sm">Sign in to view and post comments.</p>
                  {process.env.NODE_ENV !== 'production' && (
                    <p className="text-red-600 text-xs mt-2">Error loading comments.</p>
                  )}
                </div>
              }
            >
              <VideoComments videoId={video.id} initialComments={comments} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-8">
      <DeleteVideoButton id={video.id} />
      <h1 className="text-2xl font-bold mb-4">{video.title}</h1>
      <div className="w-full max-w-4xl mx-auto">
        {/* Enhanced MuxPlayer with better error handling and debugging */}
        {video.muxPlaybackId && (
          <>
            <MuxPlayer
              playbackId={video.muxPlaybackId}
              accentColor="#3b82f6"
              metadataVideoTitle={video.title}
              onError={(error) => {
                console.error('MuxPlayer error:', error);
                setPlaybackError('Playback error: ' + (error?.message || 'Unknown error'));
              }}
            />
            {/* Debug info - remove in production */}
            <div className="mt-2 p-2 bg-gray-100 text-xs text-gray-700 rounded">
              <p>Debug: Using playbackId: {video.muxPlaybackId}</p>
              <p>Status: {video.status}</p>
              <p>
                <a 
                  href={`https://stream.mux.com/${video.muxPlaybackId}.m3u8`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  Test Direct Stream URL
                </a>
              </p>
            </div>
          </>
        )}
      </div>
      <div className="mt-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <time className="text-gray-500">{formattedDate}</time>
          <span className="text-gray-500">{video.views || 0} views</span>
        </div>
        {video.description && (
          <>
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{video.description}</p>
          </>
        )}
        {/* Comments Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Comments</h2>
          <ErrorBoundary
            fallback={
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
                <p className="text-amber-700">Comments could not be loaded.</p>
                <p className="text-amber-600 text-sm">Sign in to view and post comments.</p>
                {process.env.NODE_ENV !== 'production' && (
                  <p className="text-red-600 text-xs mt-2">Error loading comments.</p>
                )}
              </div>
            }
          >
            <VideoComments videoId={video.id} initialComments={comments} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
} 