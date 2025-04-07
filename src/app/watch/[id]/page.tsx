'use client'

import { useState, useEffect } from 'react'
import { MuxPlayer } from '@/components/ui/mux-player'

interface VideoData {
  id: string
  playbackId: string
  title: string
  status: string
}

export default function WatchPage({ params }: { params: { id: string } }) {
  const [video, setVideo] = useState<VideoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVideoData() {
      try {
        setLoading(true)
        // This would typically be an API call to your database to get video info
        // For demo purposes, we'll use a mock response
        
        // In a real app, you'd fetch this from your DB:
        // const response = await fetch(`/api/videos/${params.id}`)
        // const data = await response.json()
        
        // Mock data for demonstration
        const mockData: VideoData = {
          id: params.id,
          playbackId: 'VZtzUzGxvyS02GZD7Hom02aN6QiZf0101MUiQ00rJYzEqbQ', // Replace with a real playback ID
          title: 'Demo Video',
          status: 'ready'
        }
        
        setVideo(mockData)
      } catch (err) {
        console.error('Error fetching video:', err)
        setError('Failed to load video')
      } finally {
        setLoading(false)
      }
    }

    fetchVideoData()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-red-500">
          <p>{error || 'Video not found'}</p>
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">{video.title}</h1>
      
      <div className="w-full max-w-4xl mx-auto">
        <MuxPlayer 
          playbackId={video.playbackId}
          accentColor="#3b82f6"
          metadataVideoTitle={video.title}
        />
      </div>
      
      <div className="mt-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-2">Description</h2>
        <p className="text-gray-700">
          This is a demo video powered by MUX. In a real application, this would display the video's description.
        </p>
      </div>
    </div>
  )
} 