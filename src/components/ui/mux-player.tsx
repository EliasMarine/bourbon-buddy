'use client'

import { useEffect, useState } from 'react'
import MuxPlayerReact from '@mux/mux-player-react'

interface MuxPlayerProps {
  playbackId: string
  className?: string
  accentColor?: string
  title?: string
  metadataVideoTitle?: string
  metadataViewerUserId?: string
}

export function MuxPlayer({
  playbackId,
  className = '',
  accentColor = '#FF3E00',
  title,
  metadataVideoTitle,
  metadataViewerUserId,
}: MuxPlayerProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Don't render the player on the server to avoid hydration issues
  if (!isClient) {
    return (
      <div className={`bg-muted animate-pulse flex items-center justify-center aspect-video ${className}`} />
    )
  }

  return (
    <div className={`overflow-hidden aspect-video ${className}`}>
      <MuxPlayerReact
        playbackId={playbackId}
        accentColor={accentColor}
        metadata={{ 
          video_title: metadataVideoTitle || title || 'Video',
          viewer_user_id: metadataViewerUserId,
        }}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  )
}

// Component for displaying video thumbnails from MUX
export function MuxThumbnail({
  playbackId, 
  className = '', 
  time = 0,
  token,
}: {
  playbackId: string
  className?: string
  time?: number
  token?: string
}) {
  const url = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}${token ? `&token=${token}` : ''}`

  return (
    <div className={`overflow-hidden bg-muted aspect-video ${className}`}>
      <img
        src={url}
        alt="Video thumbnail"
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  )
} 