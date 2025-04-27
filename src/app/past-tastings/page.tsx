'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from '@/hooks/use-supabase-session'
import { FileVideo, PlusCircle, UserCircle, Eye, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import SafeImage from '@/components/ui/SafeImage'

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
  createdAt: string
  updatedAt: string
  publiclyListed: boolean
  views: number
  featured?: boolean
  user?: {
    name: string
    avatar?: string
  }
}

function formatDuration(seconds: number | null) {
  if (!seconds || isNaN(seconds)) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(date: string) {
  if (!date) return ''
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

function VideoCard({ video, currentUserId, onDeleted }: {
  video: Video
  currentUserId?: string
  onDeleted: () => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const thumbnailUrl = video.muxPlaybackId
    ? `https://image.mux.com/${video.muxPlaybackId}/thumbnail.jpg?time=1`
    : undefined

  async function handleDelete() {
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
        toast.success('Video deleted')
        onDeleted()
      } else {
        setError(result?.error || 'Failed to delete video.')
      }
    } catch (err) {
      setError('An error occurred while deleting the video.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={cn(
      'group relative flex flex-col bg-gray-900 border border-gray-800 rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-amber-900/10',
      video.featured && 'ring-2 ring-amber-500/30'
    )}>
      <Link
        href={`/watch/${video.id}`}
        className="block aspect-video bg-gray-800 relative overflow-hidden"
        aria-label={`Watch ${video.title}`}
      >
        {thumbnailUrl ? (
          <SafeImage
            src={thumbnailUrl}
            alt={video.title}
            width={640}
            height={360}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            fallback={<div className="flex items-center justify-center w-full h-full bg-gray-700 text-gray-400"><FileVideo size={48} /></div>}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gray-700 text-gray-400"><FileVideo size={48} /></div>
        )}
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
            {formatDuration(video.duration)}
          </span>
        )}
      </Link>
      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center gap-2 mb-2">
          {video.user?.avatar ? (
            <SafeImage
              src={video.user.avatar}
              alt={video.user.name || 'Uploader'}
              width={32}
              height={32}
              className="rounded-full w-8 h-8 object-cover border border-gray-700"
              fallback={<UserCircle className="w-8 h-8 text-gray-400" />}
            />
          ) : (
            <UserCircle className="w-8 h-8 text-gray-400" />
          )}
          <span className="text-sm text-gray-200 font-medium truncate max-w-[120px]" title={video.user?.name || 'Uploader'}>
            {video.user?.name || 'Uploader'}
          </span>
        </div>
        <h3 className="font-semibold text-lg text-white mb-1 truncate" title={video.title}>{video.title}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <CalendarDays className="w-4 h-4" />
          <span>{formatDate(video.createdAt)}</span>
          <Eye className="w-4 h-4 ml-2" />
          <span>{video.views ?? 0} views</span>
        </div>
        {video.description && (
          <p className="text-gray-400 text-xs line-clamp-2 mb-2">{video.description}</p>
        )}
        {currentUserId && video.userId === currentUserId && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="mt-auto px-3 py-1.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition disabled:opacity-50"
            aria-label="Delete video"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
        {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
      </div>
    </div>
  )
}

export default function PastTastingsPage() {
  const { data: session } = useSession()
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVideos()
  }, [])

  async function fetchVideos() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/videos')
      if (!response.ok) throw new Error('Failed to fetch videos')
      const data = await response.json()
      setVideos(data.videos || [])
    } catch (err) {
      setError('Failed to load videos')
      setVideos([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-180px)]">
      <div className="container mx-auto px-2 sm:px-4 py-8 max-w-7xl mt-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-2">
              <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">Past Tastings</span>
            </h1>
            <p className="text-gray-300 max-w-2xl text-sm md:text-base">Browse pre-recorded bourbon tasting sessions from the community. Watch, learn, and enjoy!</p>
          </div>
          {session && (
            <Link
              href="/upload"
              className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-300 flex items-center gap-2 shadow-lg shadow-amber-900/20 whitespace-nowrap text-sm md:text-base"
            >
              <PlusCircle size={16} className="md:w-[18px] md:h-[18px]" />
              <span>Upload Video</span>
            </Link>
          )}
        </div>
        {error && (
          <div className="bg-red-100 text-red-700 rounded p-4 mb-6 text-center font-medium">{error}</div>
        )}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gradient-to-b from-gray-800/90 to-gray-900/90 rounded-xl overflow-hidden border border-gray-700 backdrop-blur-sm animate-pulse h-72" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-gradient-to-b from-gray-800/60 to-gray-900/70 rounded-2xl p-8 md:p-10 text-center backdrop-blur-sm border border-gray-700 shadow-xl shadow-black/10">
            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-full bg-gray-700/70 flex items-center justify-center p-4 md:p-5">
              <FileVideo size={36} className="text-amber-500 md:w-10 md:h-10" />
            </div>
            <h3 className="text-xl md:text-2xl font-semibold text-white mb-3">No past tastings yet</h3>
            <p className="text-gray-300 mb-6 max-w-md mx-auto text-sm md:text-base">Share your bourbon experiences with the community by uploading a tasting session.</p>
            {session ? (
              <Link href="/upload" className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-5 py-2 md:px-6 md:py-3 rounded-lg hover:from-amber-700 hover:to-amber-800 inline-block transition-all shadow-lg shadow-amber-900/20 text-sm md:text-base">
                Upload Your First Tasting
              </Link>
            ) : (
              <div className="space-y-4">
                <p className="text-amber-400 font-medium text-sm md:text-base">Sign in to upload your own tastings</p>
                <Link href="/api/auth/signin" className="bg-gray-700 text-white px-5 py-2 md:px-6 md:py-3 rounded-lg hover:bg-gray-600 inline-block transition-colors text-sm md:text-base">
                  Sign In
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                currentUserId={session?.user?.id}
                onDeleted={fetchVideos}
              />
            ))}
          </div>
        )}
        {!session && (
          <div className="mt-10 max-w-xl mx-auto mb-10">
            <Link href="/api/auth/signin" className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-3 rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 w-full font-medium">
              <PlusCircle size={18} />
              <span>Sign in to Upload a Tasting</span>
            </Link>
            <p className="text-sm text-gray-400 mt-2 text-center">Join the community and share your tasting videos</p>
          </div>
        )}
      </div>
    </div>
  )
} 