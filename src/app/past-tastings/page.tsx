'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from '@/hooks/use-supabase-session'
import { FileVideo, PlusCircle, UserCircle, Eye, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import SafeImage from '@/components/ui/SafeImage'
import { VideoCard } from '@/components/past-tastings/video-card'

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

export default function PastTastingsPage() {
  const { data: session } = useSession()
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnlyMyVideos, setShowOnlyMyVideos] = useState(false)

  // Log session information for debugging
  useEffect(() => {
    if (session) {
      console.log('Past tastings session:', {
        userId: session.user?.id,
        hasUser: !!session.user,
        isAuth: !!session.user?.id
      })
    } else {
      console.log('No session in past-tastings page')
    }
  }, [session])

  useEffect(() => {
    fetchVideos()
    syncVideosOnLoad()
    
    // Set up a timer to check for recently uploaded videos
    if (session?.user?.id) {
      const checkInterval = setInterval(async () => {
        if (showOnlyMyVideos) {
          // Only force sync when in "My Videos" view
          await forceSyncVideos()
        }
      }, 30000) // Check every 30 seconds
      
      return () => clearInterval(checkInterval)
    }
  }, [showOnlyMyVideos, session?.user?.id])

  async function fetchVideos() {
    setIsLoading(true)
    setError(null)
    try {
      let url = '/api/videos'
      
      // Add the user filter if "My Videos" is selected and the user is logged in
      if (showOnlyMyVideos && session?.user?.id) {
        const sessionUserId = session.user.id
        url = `${url}?userId=${sessionUserId}`
        console.log(`🔍 Fetching my videos with session userId: ${sessionUserId}`)
      } else {
        console.log('🔍 Fetching all videos')
      }
      
      console.log(`API request to: ${url}`)
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch videos')
      const data = await response.json()
      
      console.log(`📊 Fetched ${data.videos?.length || 0} videos`)
      if (showOnlyMyVideos && data.videos?.length === 0) {
        console.log('⚠️ No videos found for current user. Make sure you\'re logged in with the correct account.')
      }
      
      setVideos(data.videos || [])
    } catch (err) {
      console.error('❌ Error fetching videos:', err)
      setError('Failed to load videos')
      setVideos([])
    } finally {
      setIsLoading(false)
    }
  }

  // Force sync with Mux to update video status
  async function forceSyncVideos() {
    setIsLoading(true)
    try {
      console.log('Forcing video sync with Mux...')
      // First, force a sync to update any pending videos
      const syncResponse = await fetch('/api/videos/sync-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!syncResponse.ok) {
        console.error('Error syncing videos:', await syncResponse.text())
      }
      
      // Wait a moment for the sync to complete
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Then fetch the videos again
      await fetchVideos()
      toast.success('Videos refreshed from Mux')
    } catch (error) {
      console.error('Error during force sync:', error)
      toast.error('Failed to refresh videos')
    } finally {
      setIsLoading(false)
    }
  }

  async function syncVideosOnLoad() {
    try {
      await fetch('/api/videos/sync-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      setTimeout(() => fetchVideos(), 2000)
    } catch (error) {
      console.error('Background sync error:', error)
    }
  }

  // Toggle switch for filtering videos
  function VideoFilterToggle() {
    // Only show toggle when user is logged in
    if (!session) return null;
    
    // Disable toggle if we're in My Videos mode and there are no videos
    const isDisabled = showOnlyMyVideos && videos.length === 0;
    
    return (
      <div className="flex items-center gap-2">
        <div
          className={`relative px-0.5 py-0.5 bg-gray-800 rounded-full border border-gray-700/50 shadow-md ${
            isDisabled ? 'opacity-50' : ''
          }`}
        >
          <div className="flex">
            <button
              onClick={() => !isDisabled && setShowOnlyMyVideos(false)}
              className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !showOnlyMyVideos ? 'text-white' : 'text-gray-400 hover:text-white'
              } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={isDisabled || !showOnlyMyVideos}
            >
              All Videos
            </button>
            <button
              onClick={() => !isDisabled && setShowOnlyMyVideos(true)}
              className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                showOnlyMyVideos ? 'text-white' : 'text-gray-400 hover:text-white'
              } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={isDisabled || showOnlyMyVideos}
            >
              My Videos
            </button>
          </div>
          <div 
            className={`absolute inset-y-0.5 bg-gradient-to-r from-amber-600 to-amber-700 rounded-full shadow-md transition-all duration-300 ${
              showOnlyMyVideos ? 'right-0.5 left-[calc(50%+0.5px)]' : 'left-0.5 right-[calc(50%+0.5px)]'
            }`} 
            aria-hidden="true"
          />
        </div>
        
        {/* Refresh button only shown when "My Videos" is selected */}
        {showOnlyMyVideos && (
          <button 
            onClick={forceSyncVideos}
            disabled={isLoading}
            className="bg-gray-800/90 hover:bg-gray-700/90 p-2 rounded-full border border-gray-700/50 text-white transition-all shadow-md"
            title="Refresh Videos"
            aria-label="Refresh videos from Mux"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${isLoading ? 'animate-spin' : ''}`}>
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
          </button>
        )}
      </div>
    )
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
          <div className="flex items-center gap-3">
            <VideoFilterToggle />
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
        </div>
        {error && (
          <div className="bg-red-900/20 border border-red-700/30 text-red-200 rounded-xl p-4 mb-6 text-center font-medium shadow-lg">
            <div className="flex items-center justify-center gap-2">
              <span>{error}</span>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col animate-pulse">
                {/* Header skeleton */}
                <div className="h-12 bg-gray-800/80 rounded-t-xl border border-gray-700/50 px-3 py-2 flex items-center">
                  <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                  <div className="w-24 h-4 bg-gray-700 ml-2 rounded"></div>
                  <div className="ml-auto w-20 h-5 bg-gray-700 rounded-full"></div>
                </div>
                {/* Thumbnail skeleton */}
                <div className="bg-gray-800/60 aspect-video w-full"></div>
                {/* Content skeleton */}
                <div className="h-24 bg-gray-800/80 rounded-b-xl border-t-0 border border-gray-700/50 p-3">
                  <div className="w-3/4 h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="w-1/2 h-3 bg-gray-700/50 rounded mb-4"></div>
                  <div className="flex justify-between mt-4 pt-2 border-t border-gray-700/30">
                    <div className="w-20 h-3 bg-gray-700/50 rounded"></div>
                    <div className="w-16 h-3 bg-gray-700/50 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-gradient-to-b from-gray-800/60 to-gray-900/70 rounded-2xl p-8 md:p-10 text-center backdrop-blur-sm border border-gray-700/50 shadow-xl">
            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-full bg-gray-800/70 flex items-center justify-center p-4 md:p-5 border border-amber-600/20">
              <FileVideo size={36} className="text-amber-500 md:w-10 md:h-10" />
            </div>
            <h3 className="text-xl md:text-2xl font-semibold text-white mb-3">
              {showOnlyMyVideos ? "You haven't uploaded any videos yet" : "No past tastings yet"}
            </h3>
            <p className="text-gray-300 mb-6 max-w-md mx-auto text-sm md:text-base">
              {showOnlyMyVideos 
                ? "Share your bourbon experiences with the community by uploading a tasting session."
                : "Be the first to share a bourbon tasting with the community."}
            </p>
            {session ? (
              <Link href="/upload" className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-5 py-2 md:px-6 md:py-3 rounded-lg hover:from-amber-700 hover:to-amber-800 inline-block transition-all shadow-lg shadow-amber-900/20 text-sm md:text-base">
                Upload Your First Tasting
              </Link>
            ) : (
              <div className="space-y-4">
                <p className="text-amber-400 font-medium text-sm md:text-base">Sign in to upload your own tastings</p>
                <Link href="/api/auth/signin" className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2 md:px-6 md:py-3 rounded-lg inline-block transition-colors shadow-lg text-sm md:text-base border border-gray-700/50">
                  Sign In
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        {!session && videos.length > 0 && (
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