'use client'

import { Video, RefreshCcw, AlertCircle } from 'lucide-react'

interface MuxThumbnailProps {
  playbackId?: string | null
  time?: number
  token?: string
  status?: string
  duration?: number | null
  isCheckingStatus?: boolean
  onCheckStatus?: () => void
  onManualAsset?: () => void
  isFeatured?: boolean
  className?: string
  uploadId?: string | null | undefined
}

// Format duration in seconds to MM:SS format
function formatDuration(seconds: number): string {
  if (!seconds) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function MuxThumbnail({
  playbackId,
  className = '',
  time = 0,
  token,
  status = 'ready',
  duration,
  isCheckingStatus,
  onCheckStatus,
  onManualAsset,
  isFeatured,
  uploadId,
}: MuxThumbnailProps) {
  // If we have a playback ID, we can generate a thumbnail URL
  const thumbnailUrl = playbackId 
    ? `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}${token ? `&token=${token}` : ''}`
    : null

  // Determine if the main processing overlay is active
  const isShowingProcessingOverlay = !!(uploadId && !playbackId)

  return (
    <div className={`relative overflow-hidden bg-gray-900 aspect-video group ${className}`}>
      {/* Thumbnail image or placeholder */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt="Video thumbnail"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-gray-800">
          <Video className="w-16 h-16 text-gray-600" />
        </div>
      )}
      
      {/* Processing overlay - separated from the placeholder to avoid overlap */}
      {isShowingProcessingOverlay && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-black/30 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
            <p className="text-white text-sm font-medium">Processing video...</p>
          </div>
        </div>
      )}
      
      {/* Play button overlay */}
      {playbackId && status === 'ready' && (
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-5">
          <div className="bg-amber-500/90 rounded-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white w-8 h-8 md:w-10 md:h-10">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="10 8 16 12 10 16 10 8"></polygon>
            </svg>
          </div>
        </div>
      )}
      
      {/* Status indicators container - left-aligned */}
      <div className="absolute top-0 left-0 max-w-[70%] flex flex-col items-stretch gap-2 p-2 z-20">
        {/* Processing status - Hide this if the main overlay is showing */}
        {(status === 'processing' || status === 'uploading') && !isShowingProcessingOverlay && (
          <div className="bg-amber-600 text-white font-medium text-xs md:text-sm p-2 rounded-md shadow-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="animate-spin w-3 h-3 md:w-4 md:h-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="whitespace-nowrap">{status === 'processing' ? 'Processing' : 'Uploading'}</span>
            </div>
            
            <div className="flex items-center gap-1.5 ml-2">
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
                  <RefreshCcw className={`w-3 h-3 ${isCheckingStatus ? 'animate-spin' : ''}`} />
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
        
        {/* Error status */}
        {status === 'error' && (
          <div className="bg-red-600 text-white font-medium text-xs md:text-sm p-2 rounded-md shadow-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Processing Error</span>
            </div>
          </div>
        )}
        
        {/* Ready status - appears when a video just became ready */}
        {status === 'ready-new' && (
          <div className="bg-green-600 text-white font-medium text-xs md:text-sm p-2 rounded-md shadow-md">
            <div className="flex items-center gap-2">
              <svg className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="whitespace-nowrap">Ready to Watch!</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Featured badge - right-aligned */}
      {isFeatured && (
        <div className="absolute top-2 right-2 z-20">
          <div className="inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-amber-500/50 text-white text-xs font-medium shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>Featured</span>
          </div>
        </div>
      )}
      
      {/* Duration badge (bottom right) */}
      {duration !== null && duration !== undefined && (
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-white shadow-md z-10">
          {formatDuration(duration)}
        </div>
      )}
    </div>
  )
} 