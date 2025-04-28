'use client'

import { useState, useEffect } from 'react'
import MuxPlayerElement from '@mux/mux-player-react'

// MuxPlayer requires the following CSP settings:
//   img-src: https://image.mux.com
//   media-src: https://stream.mux.com blob:
//   connect-src: https://api.mux.com https://inferred.litix.io https://stream.mux.com
//   script-src: https://www.gstatic.com (for Chromecast)
// Ensure these are present in your Content Security Policy for playback and analytics to work.

interface MuxPlayerProps {
  playbackId: string
  metadataVideoTitle?: string
  metadataViewerUserId?: string
  accentColor?: string
  className?: string
  onError?: (error: any) => void
  onPlaying?: () => void
}

export function MuxPlayer({
  playbackId,
  metadataVideoTitle,
  metadataViewerUserId,
  accentColor = '#3b82f6',
  className = '',
  onError,
  onPlaying
}: MuxPlayerProps) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fallbackMode, setFallbackMode] = useState(false)

  useEffect(() => {
    // Reset state when playback ID changes
    setError(null)
    setIsLoading(true)
    setFallbackMode(false)
    
    // Log the playback ID for debugging
    console.log(`MuxPlayer: Using playbackId="${playbackId}"`);
    
    // Check if the playback ID looks valid
    if (!playbackId || playbackId.startsWith('placeholder-')) {
      console.warn(`MuxPlayer: Invalid playbackId: "${playbackId}"`);
      setError('Invalid playback ID');
      setIsLoading(false);
      if (onError) onError(new Error('Invalid playback ID'));
    }
  }, [playbackId, onError])

  const handleError = (err: any) => {
    console.error('MUX player error:', err)
    setError('Failed to load video. Please try again later.')
    setIsLoading(false)
    if (onError) onError(err)
  }

  const handlePlaying = () => {
    console.log('MuxPlayer: Video is now playing');
    setIsLoading(false)
    if (onPlaying) onPlaying()
  }
  
  const toggleFallbackMode = () => {
    setFallbackMode(prev => !prev);
    setError(null);
  }

  if (error) {
    return (
      <div className={`bg-gray-100 flex flex-col items-center justify-center ${className}`} style={{ aspectRatio: '16/9' }}>
        <div className="text-center p-6">
          <p className="text-red-500 font-medium mb-2">{error}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={() => {
                setError(null)
                setIsLoading(true)
                setFallbackMode(false)
              }}
            >
              Try Again
            </button>
            <button 
              className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
              onClick={toggleFallbackMode}
            >
              Try Direct HLS
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  if (fallbackMode) {
    return (
      <div className={`relative ${className}`} style={{ aspectRatio: '16/9' }}>
        <p className="absolute top-0 left-0 right-0 bg-amber-600 text-white text-xs p-1 text-center">Fallback Mode</p>
        <video 
          controls
          src={`https://stream.mux.com/${playbackId}.m3u8`}
          className="w-full h-full" 
          style={{ aspectRatio: '16/9' }}
          onError={handleError}
          onPlaying={handlePlaying}
          autoPlay
          muted
          playsInline
        />
        <button 
          className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded"
          onClick={toggleFallbackMode}
        >
          Switch to Player
        </button>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      <MuxPlayerElement
        playbackId={playbackId}
        metadata={{
          video_title: metadataVideoTitle || '',
          viewer_user_id: metadataViewerUserId || '',
        }}
        streamType="on-demand"
        accentColor={accentColor}
        primaryColor={accentColor}
        secondaryColor="white"
        className={className}
        onError={handleError}
        onPlaying={handlePlaying}
        style={{ '--cast-button': 'none' } as React.CSSProperties}
        autoPlay
        muted
      />
      <button 
        className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded opacity-50 hover:opacity-100"
        onClick={toggleFallbackMode}
      >
        Try Fallback
      </button>
    </div>
  )
}

// Component for displaying video thumbnails from MUX with various status indicators
export function MuxThumbnail({
  playbackId, 
  className = '', 
  time = 0,
  token,
  status,
  duration,
  isCheckingStatus,
  onCheckStatus,
  onManualAsset,
  isFeatured,
}: {
  playbackId: string
  className?: string
  time?: number
  token?: string
  status?: string
  duration?: number | null
  isCheckingStatus?: boolean
  onCheckStatus?: () => void
  onManualAsset?: () => void
  isFeatured?: boolean
}) {
  const url = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}${token ? `&token=${token}` : ''}`

  return (
    <div className={`relative overflow-hidden bg-gray-900 aspect-video group ${className}`}>
      {/* Thumbnail image */}
      <img
        src={url}
        alt="Video thumbnail"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      
      {/* Play button overlay */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="bg-amber-500/90 rounded-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white w-8 h-8 md:w-10 md:h-10">
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="10 8 16 12 10 16 10 8"></polygon>
          </svg>
        </div>
      </div>
      
      {/* Top banner container - for status indicators */}
      <div className="absolute top-0 left-0 right-0 flex flex-col items-stretch gap-1 p-2 z-10">
        {/* Processing status */}
        {status === 'processing' && (
          <div className="bg-amber-600 text-white font-medium text-xs md:text-sm p-2 rounded-md shadow-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="animate-spin w-3 h-3 md:w-4 md:h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {onCheckStatus && (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCheckStatus();
                  }}
                  className="text-white/90 hover:text-white p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                  disabled={isCheckingStatus}
                  title="Check status"
                >
                  <svg className={`w-3 h-3 ${isCheckingStatus ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 4v5h-.582m0 0a8.001 8.001 0 00-15.356 2m15.356-2H15M4 20v-5h.581m0 0a8.003 8.003 0 0015.357-2M4.581 15H9" />
                  </svg>
                </button>
              )}
              
              {onManualAsset && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onManualAsset();
                  }}
                  className="text-white/90 hover:text-white p-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                  title="Manually set MUX asset ID"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Ready status - appears when a video just became ready */}
        {status === 'ready-new' && (
          <div className="bg-green-600 text-white font-medium text-xs md:text-sm p-2 rounded-md shadow-md">
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Ready to Watch!</span>
            </div>
          </div>
        )}
        
        {/* Featured badge */}
        {isFeatured && (
          <div className="inline-flex items-center self-start gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-amber-500/50 text-white text-xs font-medium shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>Featured</span>
          </div>
        )}
      </div>
      
      {/* Duration badge (bottom right) */}
      {duration && (
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-white shadow-md z-10">
          {formatDuration(duration)}
        </div>
      )}
    </div>
  )
}

// Helper function to format duration
function formatDuration(durationInSeconds: number): string {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = Math.floor(durationInSeconds % 60);
  
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
} 