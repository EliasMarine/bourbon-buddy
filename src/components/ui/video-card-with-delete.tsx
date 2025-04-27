"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Trash2, EyeIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { deleteVideoAction } from '@/app/watch/[id]/delete-video-action'
import { MuxThumbnail } from './mux-thumbnail'

interface User {
  id: string
  name?: string
  avatar?: string | null
}

interface VideoCardWithDeleteProps {
  video: {
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
    createdAt: Date | string
    updatedAt: Date | string
    publiclyListed: boolean
    views: number
    featured?: boolean
    user?: {
      name?: string
      avatar?: string
    }
  }
  currentUserId?: string
  isCheckingStatus?: boolean
  videoStatus?: string
  hasJustBecomeReady?: boolean
  onCheckStatus?: () => void
  onManualAsset?: () => void
  onDeleted?: () => void
}

export function VideoCardWithDelete({
  video,
  currentUserId,
  isCheckingStatus,
  videoStatus,
  hasJustBecomeReady,
  onCheckStatus,
  onManualAsset,
  onDeleted,
}: VideoCardWithDeleteProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) return
    setIsDeleting(true)
    try {
      const formData = new FormData()
      formData.append('id', video.id)
      const result = await deleteVideoAction(formData)
      if (result?.success) {
        toast.success('Video deleted successfully')
        onDeleted?.()
      } else {
        toast.error(result?.error || 'Failed to delete video')
      }
    } catch (err) {
      toast.error('An error occurred while deleting the video')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/90 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-700 hover:border-amber-500/40 backdrop-blur-sm group relative">
      <Link href={`/watch/${video.id}`} className="block">
        <div className="relative">
          <MuxThumbnail
            playbackId={video.muxPlaybackId}
            time={video.thumbnailTime || 0}
            status={hasJustBecomeReady ? 'ready-new' : videoStatus || video.status}
            duration={video.duration}
            isCheckingStatus={isCheckingStatus}
            onCheckStatus={onCheckStatus}
            onManualAsset={onManualAsset}
            isFeatured={video.featured}
            uploadId={video.muxUploadId}
          />
        </div>
        <div className="p-5 md:p-6">
          <h3 className="font-semibold text-white text-lg md:text-xl mb-2 group-hover:text-amber-500 transition-colors line-clamp-1">{video.title}</h3>
          {video.description && (
            <p className="text-gray-400 text-sm mb-4 line-clamp-2">{video.description}</p>
          )}
          {video.views > 100 && (
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-300">
                <EyeIcon size={12} className="text-gray-400 flex-shrink-0" />
                {video.views} views
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-700/50">
            <div className="w-8 h-8 relative rounded-full overflow-hidden bg-gray-700 ring-1 ring-amber-500/20 flex-shrink-0">
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
            <span className="text-sm text-gray-300 font-medium truncate max-w-[120px]">
              {video.user?.name || 'Anonymous User'}
            </span>
            <span className="text-xs text-gray-500 ml-auto flex-shrink-0">
              {new Date(video.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Link>
      {currentUserId && video.userId === currentUserId && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute top-3 right-3 z-20 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg transition-colors disabled:opacity-50"
          title="Delete video"
        >
          <Trash2 size={18} className={isDeleting ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  )
} 