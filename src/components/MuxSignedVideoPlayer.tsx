'use client'

import { useState, useEffect } from 'react'

interface MuxSignedVideoPlayerProps {
  playbackId: string
  onVideoDataLoaded?: (data: { assetId: string; playbackId: string; signedUrl: string }) => void
}

export default function MuxSignedVideoPlayer({ 
  playbackId,
  onVideoDataLoaded
}: MuxSignedVideoPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [assetId, setAssetId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSignedUrl() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/mux/signed-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ playbackId }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch signed URL')
        }

        const data = await response.json()
        setSignedUrl(data.url)
        setAssetId(data.assetId)
        
        // Notify parent component if callback is provided
        if (onVideoDataLoaded && data.assetId) {
          onVideoDataLoaded({
            assetId: data.assetId,
            playbackId,
            signedUrl: data.url
          })
        }
      } catch (err) {
        console.error('Error fetching signed URL:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    if (playbackId) {
      fetchSignedUrl()
    }
  }, [playbackId, onVideoDataLoaded])

  if (isLoading) {
    return <div className="flex items-center justify-center h-48 bg-gray-100 rounded-md">Loading video...</div>
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 bg-red-50 text-red-500 rounded-md">
        Error: {error}
      </div>
    )
  }

  if (!signedUrl) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-100 rounded-md">
        No video URL available
      </div>
    )
  }

  return (
    <div className="aspect-video">
      <video
        src={signedUrl}
        controls
        className="w-full h-full rounded-md"
        poster={`https://image.mux.com/${playbackId}/thumbnail.jpg`}
        data-asset-id={assetId} // Store asset ID as a data attribute
      />
    </div>
  )
} 