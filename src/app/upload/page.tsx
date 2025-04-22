'use client'

import { useState, useEffect } from 'react'
import { MuxUploader } from '@/components/ui/mux-uploader'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'

export default function UploadPage() {
  const { user } = useSupabase() // Use the proper Supabase hook
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
    alert('Video uploaded successfully! It will be available after processing.')
    
    // Redirect to the streams page with recorded tastings
    router.push('/streams')
  }

  const handleUploadError = (errorMessage: string) => {
    console.error('Upload error:', errorMessage)
    setError(errorMessage)
    setUploading(false)
  }

  // Get user ID from Supabase user
  const userId = user?.email || ''

  if (!user) {
    return <div className="container mx-auto py-10">Loading...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>Error: {error}</p>
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <MuxUploader
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
          maxSizeMB={500}
          allowedFileTypes={['video/mp4', 'video/quicktime', 'video/mov']}
          userId={userId}
        />
      </div>
      
      <div className="mt-6 text-sm text-gray-600">
        <p>Supported formats: MP4, MOV, WebM</p>
        <p>Maximum file size: 500MB</p>
        <p>Please ensure you have the rights to upload this content.</p>
      </div>
    </div>
  )
} 