import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CalendarDays, Eye, FileVideo, PlayCircle, Trash2, UserCircle, Clock, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

/**
 * VideoCardProps defines the props for the improved VideoCard component.
 */
export interface VideoCardProps {
  video: {
    id: string
    title: string
    description: string | null
    status: string
    muxPlaybackId: string | null
    duration: number | null
    userId: string | null
    createdAt: string
    views: number
    user?: {
      name?: string
      avatar?: string | null
    }
  }
  currentUserId?: string
  onDeleted?: () => void
}

/**
 * Formats seconds as mm:ss.
 */
function formatDuration(seconds: number | null): string {
  if (!seconds || isNaN(seconds)) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Formats ISO date string to readable date.
 */
function formatDate(date: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

/**
 * Checks if a video playback ID is a placeholder
 */
function isPlaceholderId(playbackId: string | null): boolean {
  if (!playbackId) return false
  return playbackId.startsWith('placeholder-') || 
         playbackId.includes('sample-playback-id') ||
         playbackId === 'placeholder'
}

/**
 * Improved VideoCard for Past Tastings page.
 * - Responsive, accessible, modern bourbon video card.
 * - Shows thumbnail, play overlay, title, uploader, metadata, and delete button.
 * - Inspired by SocialSeed/Sok Studio design.
 */
export function VideoCard({ video, currentUserId, onDeleted }: VideoCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  
  // Handle missing or placeholder playback IDs
  const hasRealPlaybackId = video.muxPlaybackId && !isPlaceholderId(video.muxPlaybackId)
  
  // Use a Mux thumbnail if available, otherwise use a fallback
  const thumbnailUrl = hasRealPlaybackId
    ? `https://image.mux.com/${video.muxPlaybackId}/thumbnail.webp?time=1&fit_mode=pad` // Use WebP for perf
    : undefined

  // Consider a video ready even if it has a placeholder ID (for display purposes)
  const isProcessing = video.status === 'processing' || video.status === 'uploading'
  const isReady = video.status === 'ready' || (video.status !== 'error' && video.muxPlaybackId !== null)
  const hasPlaceholder = isPlaceholderId(video.muxPlaybackId)
  
  // Set appropriate message based on video status and upload time
  const getStatusMessage = () => {
    if (isProcessing) {
      // Check if this is a recent upload (within last hour)
      const uploadTime = new Date(video.createdAt).getTime()
      const now = new Date().getTime()
      const timeDiff = now - uploadTime
      const isRecentUpload = timeDiff < 60 * 60 * 1000 // 1 hour
      
      if (isRecentUpload) {
        // For very recent uploads, show a more detailed message
        if (timeDiff < 5 * 60 * 1000) { // Less than 5 minutes
          return "Just uploaded - processing will begin soon"
        } else if (timeDiff < 15 * 60 * 1000) { // Less than 15 minutes
          return "Processing video - please wait"
        } else {
          return "Processing - almost ready"
        }
      }
      return "Processing"
    }
    
    if (hasPlaceholder) return "Preview"
    if (isReady && !hasPlaceholder) return "Ready"
    return ""
  }
  
  const statusMessage = getStatusMessage()

  // Handle video deletion (only for owner)
  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!window.confirm('Are you sure you want to delete this video? This cannot be undone.')) return
    setIsDeleting(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('id', video.id)
      const res = await fetch('/watch/[id]/delete-video-action', {
        method: 'POST',
        body: formData
      })
      const result = await res.json()
      if (result?.success) {
        onDeleted?.()
      } else {
        setError(result?.error || 'Failed to delete video.')
      }
    } catch (err) {
      setError('An error occurred while deleting the video.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Fallback for uploader avatar (initials or icon)
  function renderAvatar() {
    if (video.user?.avatar)
      return (
        <Image
          src={video.user.avatar}
          alt={video.user.name || 'Uploader'}
          width={32}
          height={32}
          className="rounded-full w-8 h-8 object-cover border border-gray-700"
        />
      )
    if (video.user?.name)
      return (
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-700/80 text-white font-bold text-base border border-gray-700">
          {video.user.name[0].toUpperCase()}
        </div>
      )
    return <UserCircle className="w-8 h-8 text-gray-400" />
  }

  return (
    <div
      className="relative overflow-hidden bg-gray-800/80 rounded-xl border border-gray-700/50 shadow-xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* User info header */}
      <div className="flex items-center px-3 py-2 bg-gray-900/80 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          {renderAvatar()}
          <span className="text-sm font-medium text-white truncate max-w-[120px]">
            {video.user?.name || 'Uploader'}
          </span>
        </div>
        
        {/* Status badge */}
        {isProcessing && (
          <div className="ml-auto flex items-center gap-1 bg-blue-900/40 text-blue-200 px-2 py-0.5 rounded-full text-xs">
            <Clock size={14} className="animate-pulse" />
            <span>{statusMessage}</span>
          </div>
        )}
        {hasPlaceholder && (
          <div className="ml-auto flex items-center gap-1 bg-yellow-900/30 text-yellow-200 px-2 py-0.5 rounded-full text-xs">
            <FileVideo size={12} />
            <span>Preview</span>
          </div>
        )}
        {isReady && !hasPlaceholder && (
          <div className="ml-auto flex items-center gap-1 bg-green-900/30 text-green-200 px-2 py-0.5 rounded-full text-xs">
            <CheckCircle size={12} />
            <span>Ready</span>
          </div>
        )}
      </div>
      
      {/* Thumbnail with play overlay */}
      <Link
        href={`/watch/${video.id}`}
        className={clsx(
          "block aspect-video relative overflow-hidden group",
          isReady ? "cursor-pointer" : "cursor-default",
          isProcessing && "opacity-80"
        )}
        tabIndex={isReady ? 0 : -1}
        aria-disabled={!isReady}
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={video.title}
            width={640}
            height={360}
            className={clsx(
              "object-cover w-full h-full", 
              isHovered && isReady && "scale-105 brightness-110",
              "transition-all duration-500"
            )}
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 33vw"
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-r from-amber-900/30 to-amber-800/20 text-amber-400">
            <FileVideo size={48} className="mb-2" />
            <div className="text-sm text-amber-300/80 font-medium">
              {hasPlaceholder ? "Preview Available" : "Thumbnail Unavailable"}
            </div>
          </div>
        )}
        
        {/* Play overlay on hover/focus for ready videos */}
        {isReady && (
          <div className={clsx(
            "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            <div className="transform transition-transform duration-300 scale-100 hover:scale-110">
              <PlayCircle className="w-16 h-16 text-amber-500 drop-shadow-lg" aria-label="Play video" />
            </div>
          </div>
        )}
        
        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center max-w-[90%]">
              <Clock className="w-12 h-12 text-blue-400 animate-pulse mx-auto mb-2" />
              <p className="text-white text-sm font-medium mb-1">{statusMessage}</p>
              <p className="text-gray-300 text-xs">This may take a few minutes depending on the video size</p>
            </div>
          </div>
        )}
        
        {/* Duration badge */}
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded shadow">
            {formatDuration(video.duration)}
          </span>
        )}
      </Link>
      
      {/* Content info */}
      <div className="p-3 bg-gray-800/90">
        <h3 className="font-semibold text-base text-white line-clamp-1 mb-1" title={video.title}>
          {video.title}
        </h3>
        
        {/* Description (if present) */}
        {video.description && (
          <p className="text-gray-300 text-xs line-clamp-1 mb-2">{video.description}</p>
        )}
        
        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700/30">
          <div className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            <span>{formatDate(video.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{video.views ?? 0} views</span>
          </div>
        </div>
        
        {/* Error message */}
        {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
      </div>
      
      {/* Floating delete button (if owner) */}
      {currentUserId && video.userId === currentUserId && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute top-3 right-3 z-20 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-400"
          title="Delete video"
          aria-label="Delete video"
        >
          <Trash2 size={18} className={isDeleting ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  )
}

export default VideoCard 