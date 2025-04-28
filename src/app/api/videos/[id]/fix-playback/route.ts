import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Mux from '@mux/mux-node'

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

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const videoId = params.id
  
  console.log(`[fix-playback] Fixing video ID: ${videoId}`)
  
  try {
    // Get the video from the database
    const { data: video, error } = await supabaseAdmin
      .from('Video')
      .select('*')
      .eq('id', videoId)
      .single()
    
    if (error) {
      console.error(`[fix-playback] Error fetching video ${videoId}: ${error.message}`)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (!video) {
      console.warn(`[fix-playback] Video not found: ${videoId}`)
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Determine what needs to be fixed
    const hasPlaceholderId = video.muxPlaybackId?.startsWith('placeholder-') || 
                           video.muxPlaybackId?.includes('sample-playback-id') || 
                           false
    const hasNoAssetId = !video.muxAssetId
    
    // If we have no asset ID but have a status of 'ready', mark it properly
    if (hasNoAssetId && video.status === 'ready') {
      // Update to fix the incorrectly marked status
      const { data: updatedVideo, error: updateError } = await supabaseAdmin
        .from('Video')
        .update({
          status: 'needs_upload',
          muxPlaybackId: null, // Remove the sample ID
        })
        .eq('id', videoId)
        .single()
      
      if (updateError) {
        console.error(`[fix-playback] Update error: ${updateError.message}`)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      
      return NextResponse.json({
        fixed: true,
        message: 'Video marked as needing upload. Please re-upload video content.',
        video: updatedVideo
      })
    }
    
    // If we have an asset ID but a placeholder playback ID, sync with Mux
    if (video.muxAssetId && hasPlaceholderId) {
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
          const { data: updatedVideo, error: updateError } = await supabaseAdmin
            .from('Video')
            .update(updateData)
            .eq('id', videoId)
            .single()
          
          if (updateError) {
            console.error(`[fix-playback] Update error: ${updateError.message}`)
            return NextResponse.json({ error: updateError.message }, { status: 500 })
          }
          
          return NextResponse.json({
            fixed: true,
            message: 'Updated video with data from Mux',
            video: updatedVideo,
            assetStatus: asset.status
          })
        }
      } catch (muxError) {
        console.error(`[fix-playback] Mux error: ${muxError}`)
        return NextResponse.json({ 
          error: 'Error retrieving asset from Mux',
          details: muxError instanceof Error ? muxError.message : 'Unknown error'
        }, { status: 500 })
      }
    }
    
    // If we get here, we couldn't fix the video automatically
    return NextResponse.json({
      fixed: false,
      message: 'No automatic fix could be applied. This video may need to be re-uploaded.',
      video
    })
  } catch (error) {
    console.error(`[fix-playback] Unexpected error: ${error}`)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 