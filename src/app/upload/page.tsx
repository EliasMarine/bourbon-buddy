'use client'

import { useState, useEffect, useRef } from 'react'
import { MuxUploader } from '@/components/ui/mux-uploader'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { ArrowLeft, Video, Info } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

export default function UploadPage() {
  const { user } = useSupabase()
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      router.push('/login')
    }
  }, [user, router])

  const handleUploadComplete = (uploadId: string) => {
    console.log('Upload completed with ID:', uploadId)
    
    // Show success message
    toast.success('Video uploaded successfully! It will be available after processing.', {
      duration: 5000
    })
    
    // Redirect to the streams page with recorded tastings
    setTimeout(() => {
      router.push('/streams')
    }, 1500)
  }

  const handleUploadError = (errorMessage: string) => {
    console.error('Upload error:', errorMessage)
    setError(errorMessage)
    toast.error(`Upload error: ${errorMessage}`)
    setUploading(false)
  }

  // Get user ID from Supabase user
  const userId = user?.email || ''

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-180px)] container mx-auto px-4 py-8 max-w-5xl">
        <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-xl p-8 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
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