'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'react-hot-toast'

export interface VideoType {
  id: string
  status: string
  muxPlaybackId?: string | null
  duration?: number | null
  muxAssetId?: string | null
}

export function useVideoStatus(videos: VideoType[]) {
  const [videoStatuses, setVideoStatuses] = useState<Record<string, string>>({})
  const [isCheckingStatus, setIsCheckingStatus] = useState<Record<string, boolean>>({})
  const [manualAssetId, setManualAssetId] = useState<string>("")
  const [showManualAssetInput, setShowManualAssetInput] = useState<string | null>(null)

  // Initialize status tracking for processing videos
  useEffect(() => {
    const processingVideos = videos.filter(v => v.status === 'processing')
    
    if (processingVideos.length > 0) {
      // Initialize status tracking for these videos
      const initialStatuses = processingVideos.reduce((acc, video) => {
        acc[video.id] = video.status
        return acc
      }, {} as Record<string, string>)
      
      setVideoStatuses(prev => ({ ...prev, ...initialStatuses }))
      
      // Check status for the first processing video automatically
      if (processingVideos.length > 0) {
        // Add slight delay to avoid immediate API call after component mount
        const timeoutId = setTimeout(() => {
          checkVideoStatus(processingVideos[0].id, 'processing')
        }, 2000)
        
        return () => clearTimeout(timeoutId)
      }
    }
  }, [videos]) // eslint-disable-line react-hooks/exhaustive-deps
  // We intentionally omit checkVideoStatus from deps to avoid circular dependencies

  // Check if a video has just become ready (was processing, but now is ready)
  const hasJustBecomeReady = useCallback((videoId: string, currentStatus: string) => {
    return videoStatuses[videoId] === 'ready' && currentStatus === 'processing'
  }, [videoStatuses])

  // Function to check and update video status
  const checkVideoStatus = useCallback(async (videoId: string, currentStatus: string) => {
    // Only proceed if the video is in processing state
    if (currentStatus !== 'processing') return
    
    // Set checking status for this video
    setIsCheckingStatus(prev => ({ ...prev, [videoId]: true }))
    
    try {
      const response = await fetch(`/api/videos/${videoId}/update-status`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        
        if (response.status === 400 && errorData.error === "Video does not have a MUX asset ID") {
          // Show a toast notification for this specific error
          toast("Video is still being processed by MUX. Please try again in a minute.")
          console.log("Video processing by MUX not complete yet - no asset ID available")
        } else {
          throw new Error(`Failed to check status: ${response.status}`)
        }
        return
      }
      
      const data = await response.json()
      
      // Update the status in our local state
      setVideoStatuses(prev => ({ ...prev, [videoId]: data.status }))
      
      // If the video is now ready, show success toast
      if (data.status === 'ready' && currentStatus === 'processing') {
        toast.success("Video is ready to watch!")
      }
    } catch (error) {
      console.error('Error checking video status:', error)
      toast.error("Failed to check video status")
    } finally {
      // Clear checking status
      setIsCheckingStatus(prev => ({ ...prev, [videoId]: false }))
    }
  }, [])

  // Function to manually set a MUX asset ID for a video
  const setMuxAssetId = useCallback(async (videoId: string, assetId: string) => {
    if (!assetId.trim()) {
      toast.error("Please enter a valid MUX asset ID")
      return
    }
    
    try {
      const response = await fetch(`/api/videos/${videoId}/set-asset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ muxAssetId: assetId })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed with status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Update the status in our local state
      setVideoStatuses(prev => ({ ...prev, [videoId]: 'ready' }))
      
      // Show success message
      toast.success("Video successfully updated with MUX asset ID!")
    } catch (error) {
      console.error('Error setting MUX asset ID:', error)
      toast.error(error instanceof Error ? error.message : "Failed to set MUX asset ID")
    }
  }, [])

  return {
    videoStatuses,
    isCheckingStatus,
    manualAssetId,
    showManualAssetInput,
    hasJustBecomeReady,
    checkVideoStatus,
    setMuxAssetId,
    setManualAssetId,
    setShowManualAssetInput
  }
} 