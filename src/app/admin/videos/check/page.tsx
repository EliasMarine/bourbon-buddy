'use client'

import { useState } from 'react'

export default function VideoCheckPage() {
  const [videoId, setVideoId] = useState('')
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Function to check all videos with missing playback IDs
  const checkAllVideos = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/maintenance/fix-videos', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_MAINTENANCE_API_KEY || ''
        }
      })
      
      const data = await response.json()
      setResults(data)
      
      if (!response.ok) {
        setError(data.error || 'Failed to check videos')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  // Function to check a specific video
  const checkSpecificVideo = async () => {
    if (!videoId.trim()) {
      setError('Please enter a video ID')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/maintenance/fix-videos?videoId=${encodeURIComponent(videoId)}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_MAINTENANCE_API_KEY || ''
        }
      })
      
      const data = await response.json()
      setResults(data)
      
      if (!response.ok) {
        setError(data.error || 'Failed to check video')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Video Playback Status Check</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border rounded-lg p-4 shadow">
          <h2 className="text-xl font-bold mb-2">Check Specific Video</h2>
          <p className="text-gray-600 mb-4">
            Enter a video ID to check and fix its Mux playback ID.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder="Enter video ID"
              disabled={loading}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button 
              onClick={checkSpecificVideo} 
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check'}
            </button>
          </div>
        </div>
        
        <div className="border rounded-lg p-4 shadow">
          <h2 className="text-xl font-bold mb-2">Check All Videos</h2>
          <p className="text-gray-600 mb-4">
            Find and fix all videos with missing Mux playback IDs.
          </p>
          <button 
            onClick={checkAllVideos} 
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Checking All Videos...' : 'Check All Videos'}
          </button>
        </div>
      </div>
      
      {/* Results display */}
      {results && (
        <div className="border rounded-lg p-4 shadow mb-8">
          <h2 className="text-xl font-bold mb-2">Results</h2>
          <p className="text-gray-600 mb-4">
            {results.message}
          </p>
          
          {results.videos && results.videos.length > 0 ? (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Video ID</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {results.videos.map((video: any, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2 font-mono text-sm">{video.id}</td>
                      <td className="px-4 py-2">
                        {video.status === 'fixed' ? (
                          <span className="text-green-500">
                            ✓ Fixed
                          </span>
                        ) : (
                          <span className="text-red-500">
                            ✕ Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">{video.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              <p className="font-bold">No videos processed</p>
              <p>No videos were found or needed fixing.</p>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-600">
            Total: {results.total}, Fixed: {results.fixed}, Failed: {results.failed}
          </div>
        </div>
      )}
      
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        <p className="font-bold">About this utility</p>
        <p>
          This tool checks for videos that have Mux Asset IDs but are missing Playback IDs, 
          which can cause video playback to fail. It attempts to create new playback IDs for 
          these videos by connecting to the Mux API.
        </p>
      </div>
    </div>
  )
} 