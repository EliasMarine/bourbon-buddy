import { prisma } from '@/lib/prisma'
import { getMuxAsset, setMuxAssetIdAndCreatePlaybackId } from './mux'

/**
 * Checks and fixes videos with missing playback IDs
 * @param videoId Optional specific video ID to fix
 * @returns Summary of the operation
 */
export async function checkAndFixMuxPlaybackIds(videoId?: string) {
  try {
    // Query for videos that have an assetId but no playbackId or videos with a specific ID
    const query = {
      where: {
        ...(videoId ? { id: videoId } : {}),
        muxAssetId: { not: null },
        ...(videoId ? {} : { muxPlaybackId: null })
      }
    }

    // Find videos that need fixing
    const videos = await prisma.video.findMany(query)
    
    if (videos.length === 0) {
      return {
        success: true,
        message: videoId 
          ? `No video found with ID ${videoId}` 
          : 'No videos found with missing playback IDs',
        fixed: 0
      }
    }

    // Track results
    const results = {
      success: true,
      total: videos.length,
      fixed: 0,
      failed: 0,
      videos: [] as Array<{ id: string, status: 'fixed' | 'failed', error?: string }>
    }

    // Process each video
    for (const video of videos) {
      try {
        // Skip if already has a playback ID
        if (video.muxPlaybackId) {
          results.videos.push({
            id: video.id,
            status: 'fixed',
          })
          continue
        }

        // Verify the asset exists in Mux
        const asset = await getMuxAsset(video.muxAssetId as string)
        
        if (!asset) {
          results.failed++
          results.videos.push({
            id: video.id,
            status: 'failed',
            error: `Asset ID ${video.muxAssetId} not found in Mux`
          })
          continue
        }

        // Create a playback ID for this asset
        const result = await setMuxAssetIdAndCreatePlaybackId(
          video.id, 
          video.muxAssetId as string
        )
        
        // The setMuxAssetIdAndCreatePlaybackId function always returns an object with success: true
        // if it succeeds, otherwise it throws an error (which is caught below)
        results.fixed++
        results.videos.push({
          id: video.id,
          status: 'fixed'
        })
      } catch (error) {
        results.failed++
        results.videos.push({
          id: video.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return {
      ...results,
      message: `Processed ${results.total} videos. Fixed: ${results.fixed}, Failed: ${results.failed}`
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      fixed: 0,
      failed: 0,
      videos: []
    }
  }
} 