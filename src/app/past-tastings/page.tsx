import React, { useEffect, useState } from 'react'
import { useSession } from '@/hooks/use-supabase-session'
import { VideoCardWithDelete } from '@/components/ui/video-card-with-delete'
import { FileVideo, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

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
  featured?: boolean
  user?: {
    name: string
    avatar?: string
  }
}

export default function PastTastingsPage() {
  const { data: session } = useSession()
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingStatus, setIsCheckingStatus] = useState<Record<string, boolean>>({})
  const [videoStatuses, setVideoStatuses] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchVideos()
  }, [])

  async function fetchVideos() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/videos')
      if (!response.ok) throw new Error('Failed to fetch videos')
      const data = await response.json()
      setVideos(data.videos || [])
    } catch (err) {
      toast.error('Failed to load videos')
      setVideos([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-180px)]">
      <div className="container mx-auto px-4 py-8 max-w-7xl mt-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-2">
          <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">Past Tastings</span>
        </h1>
        <p className="text-gray-300 max-w-2xl text-sm md:text-base mb-8">Browse pre-recorded bourbon tasting sessions from the community. Watch, learn, and enjoy!</p>
        <div className="mb-8 flex justify-end">
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
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {videos.map((video) => (
              <VideoCardWithDelete
                key={video.id}
                video={video}
                currentUserId={session?.user?.id}
                isCheckingStatus={isCheckingStatus[video.id]}
                videoStatus={videoStatuses[video.id]}
                hasJustBecomeReady={false}
                onCheckStatus={() => {}}
                onManualAsset={() => {}}
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