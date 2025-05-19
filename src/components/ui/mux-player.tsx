'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'

// MuxPlayer requires the following CSP settings:
//   connect-src: https://*.mux.com https://mux.com https://*.litix.io
//   img-src: https://*.mux.com https://mux.com
//   media-src: https://*.mux.com https://mux.com
//   script-src: https://www.gstatic.com (for Chromecast)
// Ensure these are present in your Content Security Policy for playback and analytics to work.

// No need to dynamically load the script as it's already loaded in layout.tsx
function isMuxPlayerAvailable() {
  if (typeof window === 'undefined') return false;
  return window.customElements && window.customElements.get('mux-player') !== undefined;
}

// Simple loading spinner icon
const Icons = {
  spinner: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  warning: (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// Define interface for all possible props
interface MuxPlayerProps {
  playbackId: string;
  streamType?: 'on-demand' | 'live' | 'll-live';
  className?: string;
  customDomain?: string;
  startTime?: number;
  muted?: boolean;
  loop?: boolean;
  autoPlay?: boolean | 'muted' | 'any'; // Support string options for autoPlay
  accentColor?: string;
  thumbnailTime?: string;
  playsInline?: boolean;
  hideControls?: boolean;
  controls?: boolean;
  comfortLevelZones?: string;
  metadataVideoTitle?: string;
  metadataViewerUserId?: string;
  onDataReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onError?: () => void;
  onEnd?: () => void;
  onTimeUpdate?: (e: CustomEvent<any>) => void;
  maxResolution?: string;
}

// Export Mux Player component
export default function MuxPlayer({
  playbackId,
  streamType = 'on-demand',
  className = '',
  customDomain,
  startTime,
  muted = false,
  loop = false,
  autoPlay = false,
  accentColor = '#d97706', // Amber-600 from Tailwind
  thumbnailTime,
  metadataVideoTitle = '',
  metadataViewerUserId = '',
  playsInline = true,
  hideControls = false,
  controls,
  comfortLevelZones,
  maxResolution,
  onDataReady,
  onPlay,
  onPause,
  onError,
  onEnd,
  onTimeUpdate,
}: MuxPlayerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const playerRef = useRef<any>(null)

  // Set custom CSS variable for accent color
  const playerStyle = useMemo(() => {
    // Instead of creating and appending an inline style element, 
    // add a data attribute that CSS custom properties in globals.css can use
    return {
      '--accent-color': accentColor,
    } as React.CSSProperties
  }, [accentColor])

  useEffect(() => {
    // No need to do document.head manipulation that would require unsafe-inline
    // The CSS variables will be applied directly to the container via style attribute
    // which will get a proper nonce in Next.js
  }, [])

  useEffect(() => {
    if (!playbackId) return;
    
    // Handle player events
    const handleLoadStart = () => setLoading(true);
    const handleCanPlay = () => setLoading(false);
    const handleError = () => {
      setError(true);
      setLoading(false);
      if (onError) onError();
    };
    
    const player = playerRef.current;
    if (player) {
      player.addEventListener('loadstart', handleLoadStart);
      player.addEventListener('canplay', handleCanPlay);
      player.addEventListener('error', handleError);
      
      if (onPlay) player.addEventListener('play', onPlay);
      if (onPause) player.addEventListener('pause', onPause);
      if (onEnd) player.addEventListener('ended', onEnd);
      if (onTimeUpdate) player.addEventListener('timeupdate', onTimeUpdate);
      if (onDataReady) player.addEventListener('loadedmetadata', onDataReady);
    }
    
    return () => {
      if (player) {
        player.removeEventListener('loadstart', handleLoadStart);
        player.removeEventListener('canplay', handleCanPlay);
        player.removeEventListener('error', handleError);
        
        if (onPlay) player.removeEventListener('play', onPlay);
        if (onPause) player.removeEventListener('pause', onPause);
        if (onEnd) player.removeEventListener('ended', onEnd);
        if (onTimeUpdate) player.removeEventListener('timeupdate', onTimeUpdate);
        if (onDataReady) player.removeEventListener('loadedmetadata', onDataReady);
      }
    };
  }, [playbackId, onPlay, onPause, onError, onEnd, onTimeUpdate, onDataReady]);

  // No playback ID
  if (!playbackId) {
    return <div className={cn("bg-background/5 rounded-xl", className)}>No playback ID provided</div>
  }

  // Standard player markup
  return (
    <div className={cn('relative rounded-xl overflow-hidden', className)} style={playerStyle}>
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/10 z-10">
          <Icons.spinner className="h-8 w-8 animate-spin" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center p-4">
            <Icons.warning className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load video</p>
          </div>
        </div>
      )}
      
      <mux-player
        ref={playerRef}
        className="mux-player-full-size"
        playback-id={playbackId}
        stream-type={streamType}
        start-time={startTime ? String(startTime) : undefined}
        thumbnail-time={thumbnailTime ? String(thumbnailTime) : undefined}
        metadata-video-title={metadataVideoTitle}
        metadata-viewer-user-id={metadataViewerUserId}
        muted={muted ? "true" : undefined}
        loop={loop ? "true" : undefined}
        autoplay={autoPlay ? "true" : undefined}
        preload="metadata"
        playsinline={playsInline ? "true" : undefined}
        controls={hideControls ? "false" : "true"}
        maxResolution={maxResolution}
        default-duration={60}
        comfort-level-zones={comfortLevelZones}
      />
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
    <div className={`relative overflow-hidden bg-zinc-900 aspect-video group ${className}`}>
      {/* Thumbnail image */}
      <img
        src={url}
        alt="Video thumbnail"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      
      {/* Play button overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="bg-amber-600/90 rounded-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform">
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
          <div className="bg-amber-700 text-white font-medium text-xs md:text-sm p-2 rounded-md shadow-md flex items-center justify-between">
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
          <div className="bg-green-700 text-white font-medium text-xs md:text-sm p-2 rounded-md shadow-md">
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
          <div className="inline-flex items-center self-start gap-1.5 bg-black/75 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-amber-500/50 text-white text-xs font-medium shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>Featured</span>
          </div>
        )}
      </div>
      
      {/* Duration badge (bottom right) */}
      {duration && (
        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-white shadow-md z-10">
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