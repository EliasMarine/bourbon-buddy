'use client'

import { useState } from 'react'
import MuxSignedVideoPlayer from './MuxSignedVideoPlayer'

export default function MuxSignedVideoUploader() {
  const [videoUrl, setVideoUrl] = useState('')
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assetData, setAssetData] = useState<{
    assetId: string;
    playbackId: string;
    signedUrl: string;
    token: string;
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!videoUrl) {
      setError('Video URL is required')
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/mux/create-signed-asset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl,
          title: title,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed with status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Verify that assetId exists
      if (!data.assetId) {
        console.warn('Response is missing assetId', data)
      }
      
      setAssetData(data)
      
    } catch (err) {
      console.error('Error creating signed MUX asset:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleVideoDataLoaded = (data: { assetId: string; playbackId: string; signedUrl: string }) => {
    console.log('Video data loaded:', data)
    // You can use this callback to update state or perform additional actions when video data is loaded
  }
  
  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <h2 className="text-xl font-bold">Create MUX Asset with Signed Playback</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Video URL</label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://example.com/video.mp4"
            className="w-full px-3 py-2 border rounded-md"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter a publicly accessible URL to a video file
          </p>
        </div>
        
        <div>
          <label className="block mb-1">Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Video Title"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 rounded-md text-white ${
            isLoading ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isLoading ? 'Creating...' : 'Create Signed MUX Asset'}
        </button>
        
        {error && (
          <div className="p-3 bg-red-50 text-red-500 rounded-md">
            Error: {error}
          </div>
        )}
      </form>
      
      {assetData && (
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-medium">Asset Created Successfully</h3>
          
          <div className="p-4 bg-gray-50 rounded-md">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="col-span-1 font-medium">Asset ID:</div>
              <div className="col-span-2 font-mono text-sm">{assetData.assetId}</div>
              
              <div className="col-span-1 font-medium">Playback ID:</div>
              <div className="col-span-2 font-mono text-sm">{assetData.playbackId}</div>
            </div>
            
            <div className="mb-4">
              <div className="font-medium mb-1">Signed URL:</div>
              <div className="font-mono text-xs break-all bg-gray-100 p-2 rounded">
                {assetData.signedUrl}
              </div>
            </div>
            
            <div className="mb-4">
              <div className="font-medium mb-1">JWT Token:</div>
              <div className="font-mono text-xs break-all bg-gray-100 p-2 rounded">
                {assetData.token}
              </div>
            </div>
            
            <div className="mb-2 text-sm text-gray-500">
              <strong>Note:</strong> For production use, store both the asset ID and playback ID in your database.
              The asset ID is needed for management operations (deleting, updating) while the playback ID is for playback.
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Video Preview</h3>
            <MuxSignedVideoPlayer 
              playbackId={assetData.playbackId} 
              onVideoDataLoaded={handleVideoDataLoaded}
            />
          </div>
        </div>
      )}
    </div>
  )
} 