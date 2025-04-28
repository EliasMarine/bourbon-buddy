'use client'

import { useState, useEffect, useRef } from 'react'
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
  hideTryFallbackButton?: boolean
}

export function MuxPlayer({
  playbackId,
  metadataVideoTitle,
  metadataViewerUserId,
  accentColor = '#d97706', // Amber-600 for bourbon theme
  className = '',
  onError,
  onPlaying,
  hideTryFallbackButton = false
}: MuxPlayerProps) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fallbackMode, setFallbackMode] = useState(false)
  const [videoStalled, setVideoStalled] = useState(false)
  const playerRef = useRef<HTMLElement | null>(null)
  const videoMonitorRef = useRef<number | null>(null)

  // Reset state when playback ID changes
  useEffect(() => {
    setError(null)
    setIsLoading(true)
    setFallbackMode(false)
    setVideoStalled(false)
    
    // Check if the playback ID looks valid
    if (!playbackId || playbackId.startsWith('placeholder-')) {
      console.warn(`MuxPlayer: Invalid playbackId: "${playbackId}"`);
      setError('Invalid playback ID');
      setIsLoading(false);
      if (onError) onError(new Error('Invalid playback ID'));
    }
    
    // Cleanup any existing monitoring
    return () => {
      if (videoMonitorRef.current) {
        window.clearInterval(videoMonitorRef.current);
        videoMonitorRef.current = null;
      }
    };
  }, [playbackId, onError])

  // Function to monitor video rendering
  const startVideoMonitoring = () => {
    // Clear any existing monitoring
    if (videoMonitorRef.current) {
      window.clearInterval(videoMonitorRef.current);
    }
    
    // Reset stalled state
    setVideoStalled(false);
    
    // Start monitoring the video element for rendering issues
    videoMonitorRef.current = window.setInterval(() => {
      const muxPlayerElement = playerRef.current;
      if (!muxPlayerElement) return;
      
      try {
        // Access the underlying video element
        const videoElement = muxPlayerElement.querySelector('video');
        if (!videoElement) return;
        
        // Check if the video is playing but has a black screen or rendering issues
        // videoHeight will be 0 if the video is not rendering correctly
        if (
          !videoElement.paused && 
          !videoElement.ended && 
          videoElement.currentTime > 0 && 
          videoElement.readyState >= 3 && // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
          (videoElement.videoWidth === 0 || videoElement.videoHeight === 0 || videoElement.getVideoPlaybackQuality?.()?.totalVideoFrames === 0)
        ) {
          console.warn('MuxPlayer: Video stalled - black screen detected');
          setVideoStalled(true);
          
          // Stop the monitoring interval
          if (videoMonitorRef.current) {
            window.clearInterval(videoMonitorRef.current);
            videoMonitorRef.current = null;
          }
          
          // Auto-switch to fallback mode
          setFallbackMode(true);
        }
      } catch (e) {
        console.error('Error monitoring video playback:', e);
      }
    }, 2000); // Check every 2 seconds
  };

  // Apply custom styling to the Mux player volume slider and quality menu
  useEffect(() => {
    // This CSS is needed to fix the volume slider and resolution menu background
    const style = document.createElement('style')
    style.textContent = `
      /* Fix for volume slider having transparent background */
      mux-player .volume-slider,
      mux-player mwc-slider,
      mux-player mwc-slider *,
      mux-player [part="volume-slider"],
      mux-player [part="volume-range"] {
        background-color: #000000 !important;
        --mdc-slider-bg-color: #000000 !important;
        --mdc-slider-bg-color-behind-component: #000000 !important;
      }
      
      /* Color for the slider track */
      mux-player .volume-slider mwc-slider::part(inactive-track),
      mux-player .volume-slider mwc-slider::part(active-track),
      mux-player [part="volume-range"]::part(inactive-track),
      mux-player [part="volume-range"]::part(active-track) {
        background-color: #666666 !important;
      }
      
      mux-player [part="volume-range"]::part(active-track) {
        background-color: ${accentColor} !important;
      }
      
      /* Style for the slider thumb */
      mux-player .volume-slider mwc-slider::part(thumb),
      mux-player [part="volume-range"]::part(thumb) {
        background-color: ${accentColor} !important;
        border-color: ${accentColor} !important;
      }
      
      /* Fix for resolution menu dialog backdrop */
      mux-player dialog::backdrop {
        background-color: rgba(0, 0, 0, 0.7) !important;
      }
      
      /* Style for dialog content - the quality selector menu */
      mux-player dialog.mux-player-quality-menu,
      mux-player [part="quality-menu"] {
        background-color: #1f1f1f !important;
        color: white !important;
        border-radius: 8px !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        padding: 12px !important;
        min-width: 200px !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5) !important;
      }
      
      /* Dialog title */
      mux-player dialog h2,
      mux-player [part="quality-menu"] h2 {
        color: white !important;
        font-size: 16px !important;
        margin-bottom: 12px !important;
        padding-bottom: 8px !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
      }
      
      /* Style for menu options */
      mux-player dialog button,
      mux-player [part="quality-menu"] button {
        background-color: transparent !important;
        color: white !important;
        border: none !important;
        padding: 8px 12px !important;
        text-align: left !important;
        width: 100% !important;
        border-radius: 4px !important;
        font-size: 14px !important;
        margin: 2px 0 !important;
        position: relative !important;
      }
      
      /* Style for selected option in resolution menu */
      mux-player dialog .selectedOption,
      mux-player [part="quality-menu"] .selectedOption,
      mux-player dialog [aria-selected="true"],
      mux-player [part="quality-menu"] [aria-selected="true"] {
        background-color: rgba(217, 119, 6, 0.2) !important;
        color: ${accentColor} !important;
        font-weight: bold !important;
      }
      
      /* Hover state for buttons */
      mux-player dialog button:hover,
      mux-player [part="quality-menu"] button:hover {
        background-color: rgba(217, 119, 6, 0.1) !important;
      }
      
      /* Add a checkmark to selected option */
      mux-player dialog .selectedOption::after,
      mux-player [part="quality-menu"] .selectedOption::after,
      mux-player dialog [aria-selected="true"]::after,
      mux-player [part="quality-menu"] [aria-selected="true"]::after {
        content: '✓';
        position: absolute;
        right: 12px;
        color: ${accentColor};
      }
      
      /* Auto quality styles */
      mux-player dialog [aria-label="Auto"],
      mux-player [part="quality-menu"] [aria-label="Auto"] {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        margin-bottom: 8px !important;
        padding-bottom: 12px !important;
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [accentColor])

  const handleError = (err: any) => {
    console.error('MUX player error:', err)
    setError('Failed to load video. Please try again later.')
    setIsLoading(false)
    if (onError) onError(err)
  }

  const handleStalled = () => {
    console.warn('MuxPlayer: Video stalled event detected');
    // We don't immediately switch to fallback, but let the monitor handle it
    // This helps avoid false positives from brief network hiccups
  }

  const handlePlaying = () => {
    console.log('MuxPlayer: Video is now playing');
    setIsLoading(false)
    
    // Start monitoring for video rendering issues
    startVideoMonitoring();
    
    if (onPlaying) onPlaying()
  }
  
  const toggleFallbackMode = () => {
    // Stop any existing monitoring when manually toggling
    if (videoMonitorRef.current) {
      window.clearInterval(videoMonitorRef.current);
      videoMonitorRef.current = null;
    }
    
    setFallbackMode(prev => !prev);
    setError(null);
    setVideoStalled(false);
  }

  if (videoStalled) {
    return (
      <div className={`bg-zinc-900 flex flex-col items-center justify-center ${className}`} style={{ aspectRatio: '16/9' }}>
        <div className="text-center p-6">
          <p className="text-amber-400 font-medium mb-4">Video playback issue detected</p>
          <p className="text-zinc-300 mb-4">The video has encountered a rendering issue, but the audio may still be working.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              className="px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700 transition-colors"
              onClick={() => {
                setVideoStalled(false)
                setIsLoading(true)
                setFallbackMode(false)
              }}
            >
              Try Again
            </button>
            <button 
              className="px-4 py-2 bg-amber-700 text-white rounded-md hover:bg-amber-600 transition-colors"
              onClick={() => {
                setFallbackMode(true);
                setVideoStalled(false);
              }}
            >
              Switch to Alternate Player
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-zinc-900 flex flex-col items-center justify-center ${className}`} style={{ aspectRatio: '16/9' }}>
        <div className="text-center p-6">
          <p className="text-red-400 font-medium mb-4">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              className="px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700 transition-colors"
              onClick={() => {
                setError(null)
                setIsLoading(true)
                setFallbackMode(false)
              }}
            >
              Try Again
            </button>
            {!hideTryFallbackButton && (
              <button 
                className="px-4 py-2 bg-amber-700 text-white rounded-md hover:bg-amber-600 transition-colors"
                onClick={toggleFallbackMode}
              >
                Try Direct HLS
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  if (fallbackMode) {
    return (
      <div className={`relative ${className}`} style={{ aspectRatio: '16/9' }}>
        {!hideTryFallbackButton && (
          <p className="absolute top-0 left-0 right-0 bg-amber-700 text-white text-xs p-1.5 text-center z-10">Alternate Player Mode</p>
        )}
        <video 
          controls
          src={`https://stream.mux.com/${playbackId}.m3u8`}
          className="w-full h-full bg-black" 
          style={{ aspectRatio: '16/9' }}
          onError={handleError}
          onPlaying={handlePlaying}
          onStalled={handleStalled}
          autoPlay
          muted
          playsInline
        />
        {!hideTryFallbackButton && (
          <button 
            className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/80 text-white text-xs rounded-md hover:bg-black/90 transition-colors z-10"
            onClick={toggleFallbackMode}
          >
            Switch to Main Player
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-amber-500"></div>
        </div>
      )}
      <MuxPlayerElement
        ref={playerRef}
        playbackId={playbackId}
        metadata={{
          video_title: metadataVideoTitle || '',
          viewer_user_id: metadataViewerUserId || '',
        }}
        streamType="on-demand"
        accentColor={accentColor}
        primaryColor={accentColor}
        secondaryColor="#000000"
        className={className}
        onError={handleError}
        onPlaying={handlePlaying}
        onStalled={handleStalled}
        style={{ 
          '--controls-background-color': 'rgba(0, 0, 0, 0.8)',
          '--seek-backward-button': 'rgba(0, 0, 0, 0.8)',
          '--seek-forward-button': 'rgba(0, 0, 0, 0.8)',
          '--play-button': 'rgba(0, 0, 0, 0.8)',
          '--volume-range': '#000000',
          '--mute-button': 'rgba(0, 0, 0, 0.8)',
          '--time-display': 'rgba(0, 0, 0, 0.8)',
          '--time-range': 'rgba(0, 0, 0, 0.8)',
          '--live-button': 'rgba(0, 0, 0, 0.8)',
          '--casting-button': 'rgba(0, 0, 0, 0.8)',
          '--airplay-button': 'rgba(0, 0, 0, 0.8)',
          '--pip-button': 'rgba(0, 0, 0, 0.8)',
          '--fullscreen-button': 'rgba(0, 0, 0, 0.8)',
          '--rendition-selectmenu': 'rgba(0, 0, 0, 0.8)',
          '--playback-rate-selectmenu': 'rgba(0, 0, 0, 0.8)',
          '--volume-slider': '#000000',
          '--cast-button': 'none',
          '--dialog-background-color': '#1f1f1f',
          'margin': '0',
          'background-color': '#000000'
        } as React.CSSProperties}
        autoPlay
        muted
      />
      {!hideTryFallbackButton && (
        <button 
          className="absolute bottom-3 right-3 px-2.5 py-1.5 bg-black/80 text-white text-xs rounded-md opacity-50 hover:opacity-100 z-10 transition-opacity"
          onClick={toggleFallbackMode}
        >
          Try Fallback
        </button>
      )}
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