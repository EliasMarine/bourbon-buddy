'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { MuxUploader } from '@/components/ui/mux-uploader'
import { useRouter } from 'next/navigation'
import { Info } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { ArrowLeft, Video } from 'lucide-react'
import Link from 'next/link'

export default function UploadPage() {
  const { user } = useSupabase()
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Get the user ID from Supabase Auth
  const userId = useMemo(() => {
    const id = user?.id || ''
    console.log('Upload page user ID from Supabase Auth:', id)
    return id
  }, [user])

  // Redirect if not logged in
  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      router.push('/login')
    } else if (user) {
      console.log('User authenticated in upload page:', { 
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      })
    }
  }, [user, router])

  const handleUploadComplete = (uploadId: string) => {
    toast.success('Video uploaded successfully!')
    console.log('Upload completed with ID:', uploadId)
    
    // Redirect to past-tastings page after a delay
    setTimeout(() => {
      router.push('/past-tastings')
    }, 3000)
  }

  const handleUploadError = (error: string) => {
    toast.error(`Upload failed: ${error}`)
    console.error('Upload error:', error)
  }

  // Handle case where user is not authenticated
  if (!user || !userId) {
    return (
      <div className="min-h-[calc(100vh-180px)] container mx-auto px-4 py-8 max-w-5xl">
        <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-xl p-8 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="text-gray-400 mt-6">Please sign in to upload videos</p>
          <button
            onClick={() => router.push('/api/auth/signin')}
            className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-180px)]">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/streams"
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-amber-500" />
          </Link>
          <h1 className="text-3xl font-bold text-white">Upload Tasting Video</h1>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-xl overflow-hidden mb-10">
            {error && (
              <div className="mb-0 bg-red-900/60 border-b border-red-700 text-red-100 px-4 py-3">
                {error}
              </div>
            )}
            
            <div className="p-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Share Your Bourbon Experience</h2>
                <p className="text-gray-400 text-sm">Record a video and share it with the community</p>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 mb-6">
                <div className="flex items-start gap-2">
                  <Info size={18} className="text-amber-400 mt-0.5" />
                  <p className="text-sm text-gray-300">
                    Your video will be processed after upload and will appear in the "Recorded Tastings" section. 
                    This may take a few minutes depending on the size of your video.
                  </p>
                </div>
              </div>
              
              {/* Small debug info */}
              <div className="mb-4 text-xs text-gray-500">
                <p>Your user ID: {userId || 'Not available'}</p>
              </div>
              
              <MuxUploader
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxSizeMB={500}
                allowedFileTypes={['video/mp4', 'video/quicktime', 'video/mov']}
                userId={userId}
                className="bg-transparent border-0 p-0"
              />
            </div>
          </div>
          
          <div className="text-center text-gray-400 text-sm">
            <p>Please ensure you have the rights to upload this content.</p>
            <p className="mt-1">Supported formats: MP4, MOV, WebM | Maximum file size: 500MB</p>
          </div>
        </div>
      </div>
    </div>
  )
} 