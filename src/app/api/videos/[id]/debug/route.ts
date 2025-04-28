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
  
  console.log(`[debug] Checking video ID: ${videoId}`)
  
  try {
    // Get the video from the database
    const { data: video, error } = await supabaseAdmin
      .from('Video')
      .select('*')
      .eq('id', videoId)
      .single()
    
    if (error) {
      console.error(`[debug] Error fetching video ${videoId}: ${error.message}`)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (!video) {
      console.warn(`[debug] Video not found: ${videoId}`)
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }
    
    // Check if the video has a Mux asset ID
    let muxAssetStatus = null
    let muxAssetDetails = null
    
    if (video.muxAssetId) {
      try {
        const asset = await muxClient.video.assets.retrieve(video.muxAssetId)
        muxAssetStatus = asset.status
        muxAssetDetails = {
          playbackIds: asset.playback_ids,
          status: asset.status,
          duration: asset.duration,
          aspectRatio: asset.aspect_ratio,
        }
      } catch (muxError) {
        console.error(`[debug] Error checking Mux asset: ${muxError}`)
        muxAssetStatus = 'error_fetching'
      }
    }
    
    // Return all the data for debugging
    return NextResponse.json({
      video,
      muxAssetStatus,
      muxAssetDetails,
      hasPlaceholderId: video.muxPlaybackId?.startsWith('placeholder-') || video.muxPlaybackId?.includes('sample-playback-id') || false,
      needsMuxAssetId: !video.muxAssetId,
      needsRealPlaybackId: 
        (video.muxPlaybackId?.startsWith('placeholder-') || 
         video.muxPlaybackId?.includes('sample-playback-id') || 
         !video.muxPlaybackId) && 
        !!video.muxAssetId
    })
  } catch (error) {
    console.error(`[debug] Unexpected error: ${error}`)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 