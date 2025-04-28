import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-api'
import { muxClient } from '@/lib/mux'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('videoId')
  const allVideos = searchParams.get('all') === 'true'
  
  // If no videoId is provided and all is not true, return an error
  if (!videoId && !allVideos) {
    return NextResponse.json({ 
      success: false, 
      error: 'Missing videoId parameter or all=true flag'
    }, { status: 400 })
  }
  
  try {
    const supabase = createAdminClient()
    
    // Process a single video if videoId is provided
    if (videoId) {
      const { data: video } = await supabase
        .from('Video')
        .select('id, muxAssetId, muxPlaybackId, status')
        .eq('id', videoId)
        .single()
      
      if (!video) {
        return NextResponse.json({ 
          success: false, 
          error: `Video with ID ${videoId} not found`
        }, { status: 404 })
      }
      
      // If no Mux asset ID, can't add a playback ID
      if (!video.muxAssetId) {
        return NextResponse.json({ 
          success: false, 
          error: `Video ${videoId} has no Mux asset ID`,
          video
        }, { status: 400 })
      }
      
      // Add public playback ID to the asset
      const result = await addPublicPlaybackId(video.muxAssetId, video.id)
      
      return NextResponse.json({
        success: true,
        video: {
          id: video.id,
          muxAssetId: video.muxAssetId,
          old_playback_id: video.muxPlaybackId,
          ...result
        }
      })
    }
    
    // Process all videos if all=true is provided
    if (allVideos) {
      const { data: videos } = await supabase
        .from('Video')
        .select('id, muxAssetId, muxPlaybackId, status')
        .not('muxAssetId', 'is', null)
      
      if (!videos || videos.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'No videos with Mux asset IDs found'
        }, { status: 404 })
      }
      
      const results = await Promise.all(
        videos.map(async (video: any) => {
          if (!video.muxAssetId) return { 
            id: video.id, 
            success: false, 
            error: 'No Mux asset ID'
          }
          
          try {
            const result = await addPublicPlaybackId(video.muxAssetId, video.id)
            return {
              id: video.id,
              muxAssetId: video.muxAssetId,
              old_playback_id: video.muxPlaybackId,
              ...result
            }
          } catch (error: any) {
            return {
              id: video.id,
              muxAssetId: video.muxAssetId,
              success: false,
              error: error.message || 'Unknown error'
            }
          }
        })
      )
      
      const successful = results.filter(r => r.success).length
      
      return NextResponse.json({
        success: true,
        summary: {
          total: results.length,
          successful,
          failed: results.length - successful
        },
        results
      })
    }
    
  } catch (error: any) {
    console.error('Error adding public playback ID:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Adds a public playback ID to a Mux asset and updates the Supabase Video record.
 * @param muxAssetId - The Mux asset ID
 * @param videoId - The Supabase Video ID
 * @returns Result object with success, playback_id, and is_public
 */
async function addPublicPlaybackId(muxAssetId: string, videoId: string): Promise<{ success: boolean; playback_id?: string; is_public?: boolean; error?: string }> {
  try {
    // Add a public playback ID to the Mux asset
    const playbackResponse = await muxClient.video.assets.createPlaybackId(muxAssetId, {
      policy: 'public'
    })
    
    if (!playbackResponse || !playbackResponse.id) {
      throw new Error('Failed to create public playback ID')
    }
    const publicPlaybackId = playbackResponse.id
    
    // Update the video record in Supabase with the new public playback ID
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('Video')
      .update({ 
        muxPlaybackId: publicPlaybackId,
        updatedAt: new Date().toISOString()
      })
      .eq('id', videoId)
    
    if (error) {
      throw new Error(`Failed to update video record: ${error.message}`)
    }
    
    // Revalidate any paths that would be using this video
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/revalidate?path=/watch/${videoId}`, { method: 'POST' })
    } catch (revalidateError) {
      console.error('Error revalidating paths:', revalidateError)
      // Don't fail the whole operation if revalidation fails
    }
    
    return {
      success: true,
      playback_id: publicPlaybackId,
      is_public: true
    }
  } catch (error: any) {
    console.error(`Error adding public playback ID to asset ${muxAssetId}:`, error)
    return {
      success: false,
      error: error.message || 'Unknown error'
    }
  }
} 