'use client'

import { useState } from 'react'
import { createMuxUpload } from '@/lib/mux'

export default function MuxTestPage() {
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const handleCreateUpload = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setStatus('Creating Mux upload URL...')
      
      // Direct call to createMuxUpload from lib/mux
      const upload = await createMuxUpload({})
      
      if (!upload || !upload.url) {
        throw new Error('Failed to create upload URL')
      }
      
      setUploadUrl(upload.url)
      setStatus(`Upload created with ID: ${upload.id}`)
    } catch (err) {
      console.error('Error creating MUX upload:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
      setStatus('Error creating upload')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Mux Upload Test</h1>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          This is a minimal test page to verify Mux upload functionality without depending on authentication or database.
        </p>
        
        <button
          onClick={handleCreateUpload}
          disabled={isLoading}
          className={`px-4 py-2 rounded-md ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoading ? 'Creating...' : 'Create Mux Upload URL'}
        </button>
      </div>
      
      {status && (
        <div className="mb-4 p-2 bg-gray-100 rounded">
          <p>Status: {status}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p>Error: {error}</p>
        </div>
      )}
      
      {uploadUrl && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <p className="mb-4">Upload URL is ready!</p>
            
            <div className="bg-gray-100 p-2 rounded text-sm mb-4 overflow-x-auto">
              <code>{uploadUrl}</code>
            </div>
            
            <p className="mb-4">You can open this URL to upload directly:</p>
            <a
              href={uploadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Open Upload URL
            </a>
          </div>
        </div>
      )}
    </div>
  )
} 