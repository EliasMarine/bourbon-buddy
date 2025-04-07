'use client'

import { useEffect, useState } from 'react'
// Import standard HTML elements instead of MuxUploaderReact
// This allows us to build without errors while still showing how it would work

interface UploadError {
  message: string;
}

export default function UploadPage() {
  const [uploadUrl, setUploadUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function createUploadUrl() {
      try {
        setIsLoading(true)
        // Call your create upload endpoint
        const response = await fetch('/api/mux/upload', {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Failed to create upload URL')
        }

        const data = await response.json()
        setUploadUrl(data.url)
      } catch (err) {
        console.error('Error creating MUX upload URL:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    createUploadUrl()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-red-500">
          <p>Error: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const handleSuccess = () => {
    alert('Upload successful!')
  }

  const handleError = (err: UploadError) => {
    console.error('Upload error:', err)
    alert('Upload failed: ' + err.message)
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        {uploadUrl ? (
          <div className="text-center">
            <p className="mb-4">Upload URL is ready. In production, this would use:</p>
            <pre className="bg-gray-100 p-2 rounded text-sm mb-4 overflow-x-auto">
              {`<MuxUploaderReact 
  endpoint="${uploadUrl}"
  onSuccess={handleSuccess}
  onError={handleError}
/>`}
            </pre>
            
            <p className="mb-4">For now, you can visit this URL to view the upload interface:</p>
            <a href={uploadUrl} target="_blank" rel="noopener noreferrer" 
              className="text-blue-600 hover:underline">
              Open MUX Upload URL
            </a>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            Failed to create upload URL. Please refresh and try again.
          </div>
        )}
      </div>
      
      <div className="mt-6 text-sm text-gray-600">
        <p>Supported formats: MP4, MOV, WebM, etc.</p>
        <p>Maximum file size: 500MB</p>
      </div>
    </div>
  )
} 