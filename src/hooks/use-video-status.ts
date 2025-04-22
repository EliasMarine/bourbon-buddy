'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
  const pendingChecks = useRef<Record<string, boolean>>({})
  const lastCheckedRef = useRef<Record<string, number>>({})
  
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
      
      // Check status for the first processing video automatically if not checked recently
      if (processingVideos.length > 0) {
        const firstVideo = processingVideos[0]
        const lastChecked = lastCheckedRef.current[firstVideo.id] || 0
        const now = Date.now()
        
        // Only check if it's been at least 10 seconds since the last check
        if (now - lastChecked > 10000 && !pendingChecks.current[firstVideo.id]) {
          // Add slight delay to avoid immediate API call after component mount
          const timeoutId = setTimeout(() => {
            checkVideoStatus(firstVideo.id, 'processing')
          }, 5000)
          
          return () => clearTimeout(timeoutId)
        }
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
    
    // Check if we already have a pending check for this video
    if (pendingChecks.current[videoId]) return
    pendingChecks.current[videoId] = true
    
    // Check if we've checked recently
    const lastChecked = lastCheckedRef.current[videoId] || 0
    const now = Date.now()
    if (now - lastChecked < 5000) {
      pendingChecks.current[videoId] = false
      return
    }
    
    // Set checking status for this video
    setIsCheckingStatus(prev => ({ ...prev, [videoId]: true }))
    lastCheckedRef.current[videoId] = now
    
    try {
      const response = await fetch(`/api/videos/${videoId}/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: currentStatus })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        if (response.status === 400 && errorData.error === "Video does not have a MUX asset ID") {
          // This is an expected error state during processing
          toast("Video is still being processed by MUX. Please try again in a minute.", {
            icon: '⏳',
            duration: 3000
          })
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
      toast.error("Failed to check video status", { duration: 3000 })
    } finally {
      // Clear checking status
      setIsCheckingStatus(prev => ({ ...prev, [videoId]: false }))
      // Allow checking again after a delay
      setTimeout(() => {
        pendingChecks.current[videoId] = false
      }, 5000)
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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
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