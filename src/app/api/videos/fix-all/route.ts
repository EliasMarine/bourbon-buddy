import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Mux from '@mux/mux-node'
import { revalidatePath } from 'next/cache'

// Initialize Mux client
const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || '',
  tokenSecret: process.env.MUX_TOKEN_SECRET || '',
})

// Create Supabase admin client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: Request) {
  console.log('[fix-all] Starting video status cleanup')
  
  try {
    // Get all videos from the database
    const { data: videos, error } = await supabaseAdmin
      .from('Video')
      .select('*')
    
    if (error) {
      console.error(`[fix-all] Error fetching videos: ${error.message}`)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (!videos || videos.length === 0) {
      console.warn(`[fix-all] No videos found in database`)
      return NextResponse.json({ message: 'No videos found' }, { status: 404 })
    }
    
    console.log(`[fix-all] Found ${videos.length} videos to check`)
    
    const resultsMap: Record<string, any> = {
      fixed: 0,
      noAssetId: 0,
      placeholderIds: 0,
      alreadyFixed: 0,
      skipped: 0,
      errors: 0
    }
    
    const fixResults = await Promise.all(videos.map(async (video) => {
      try {
        // Determine what needs to be fixed
        const hasPlaceholderId = video.muxPlaybackId?.startsWith('placeholder-') || 
                               video.muxPlaybackId?.includes('sample-playback-id') || 
                               false
        const hasNoAssetId = !video.muxAssetId
        
        // If we have no asset ID but have a status of 'ready', mark it properly
        if (hasNoAssetId && video.status === 'ready') {
          resultsMap.noAssetId++
          
          // Update to fix the incorrectly marked status
          const { error: updateError } = await supabaseAdmin
            .from('Video')
            .update({
              status: 'needs_upload',
              muxPlaybackId: null, // Remove the sample ID
            })
            .eq('id', video.id)
          
          if (updateError) {
            console.error(`[fix-all] Update error for video ${video.id}: ${updateError.message}`)
            resultsMap.errors++
            return {
              videoId: video.id,
              status: 'error',
              message: updateError.message
            }
          }
          
          resultsMap.fixed++
          return {
            videoId: video.id,
            status: 'fixed',
            action: 'marked_needs_upload'
          }
        }
        
        // If we have an asset ID but a placeholder playback ID, sync with Mux
        if (video.muxAssetId && hasPlaceholderId) {
          resultsMap.placeholderIds++
          
          try {
            // Check with Mux for the real playback ID
            const asset = await muxClient.video.assets.retrieve(video.muxAssetId)
            
            // If the asset exists, update our record
            if (asset) {
              const updateData: Record<string, any> = {
                status: asset.status
              }
              
              // If it's ready, add the real playback ID if available
              if (asset.status === 'ready' && asset.playback_ids && asset.playback_ids.length > 0) {
                updateData.muxPlaybackId = asset.playback_ids[0].id
                updateData.duration = asset.duration || video.duration
                updateData.aspectRatio = asset.aspect_ratio || video.aspectRatio
              }
              
              // Update the video record
              const { error: updateError } = await supabaseAdmin
                .from('Video')
                .update(updateData)
                .eq('id', video.id)
              
              if (updateError) {
                console.error(`[fix-all] Update error for video ${video.id}: ${updateError.message}`)
                resultsMap.errors++
                return {
                  videoId: video.id,
                  status: 'error',
                  message: updateError.message
                }
              }
              
              resultsMap.fixed++
              return {
                videoId: video.id,
                status: 'fixed',
                action: 'updated_from_mux',
                muxStatus: asset.status
              }
            }
          } catch (muxError) {
            console.error(`[fix-all] Mux error for video ${video.id}: ${muxError}`)
            resultsMap.errors++
            return {
              videoId: video.id,
              status: 'error',
              message: muxError instanceof Error ? muxError.message : 'Unknown error retrieving asset from Mux'
            }
          }
        }
        
        // No issues found with this video
        resultsMap.alreadyFixed++
        return {
          videoId: video.id,
          status: 'skipped',
          message: 'No issues found'
        }
      } catch (error) {
        console.error(`[fix-all] Unexpected error processing video ${video.id}: ${error}`)
        resultsMap.errors++
        return {
          videoId: video.id,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }))
    
    // Revalidate paths to refresh the UI
    revalidatePath('/past-tastings')
    revalidatePath('/watch/[id]', 'page')
    
    return NextResponse.json({
      success: true,
      summary: resultsMap,
      totalVideos: videos.length,
      results: fixResults
    })
  } catch (error) {
    console.error(`[fix-all] Unexpected error: ${error}`)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 