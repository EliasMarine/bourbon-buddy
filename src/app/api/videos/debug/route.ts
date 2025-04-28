import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('videoId')
  
  try {
    // If videoId is provided, get a specific video
    if (videoId) {
      const { data: video, error } = await supabaseAdmin
        .from('Video')
        .select('*')
        .eq('id', videoId)
        .single()
        
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      
      // Check Mux ID validity
      const muxInfo = {
        hasMuxUploadId: !!video.muxUploadId,
        hasMuxAssetId: !!video.muxAssetId,
        hasMuxPlaybackId: !!video.muxPlaybackId,
        hasPlaceholderId: video.muxPlaybackId?.startsWith('placeholder-') || false,
        playbackUrl: video.muxPlaybackId ? `https://stream.mux.com/${video.muxPlaybackId}.m3u8` : null,
        status: video.status,
      }
      
      return NextResponse.json({
        video,
        muxInfo,
        message: 'Video found',
      })
    }
    
    // Without videoId, get all videos with counts and status summary
    const { data: videos, error } = await supabaseAdmin
      .from('Video')
      .select('id, title, status, muxUploadId, muxAssetId, muxPlaybackId')
      .order('createdAt', { ascending: false })
      
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    // Analyze the videos
    const summary = {
      total: videos.length,
      ready: videos.filter(v => v.status === 'ready').length,
      processing: videos.filter(v => v.status === 'processing').length,
      needsUpload: videos.filter(v => v.status === 'needs_upload').length,
      error: videos.filter(v => v.status === 'error').length,
      other: videos.filter(v => !['ready', 'processing', 'needs_upload', 'error'].includes(v.status)).length,
      
      // Count videos with valid/invalid IDs
      withMuxUploadId: videos.filter(v => !!v.muxUploadId).length,
      withMuxAssetId: videos.filter(v => !!v.muxAssetId).length,
      withMuxPlaybackId: videos.filter(v => !!v.muxPlaybackId).length,
      withPlaceholderId: videos.filter(v => v.muxPlaybackId?.startsWith('placeholder-')).length,
      
      // Identify problematic videos
      mismatched: videos.filter(v => 
        (v.status === 'ready' && !v.muxPlaybackId) || 
        (v.status === 'ready' && !v.muxAssetId) ||
        (v.status === 'ready' && v.muxPlaybackId?.startsWith('placeholder-'))
      ).length,
    }
    
    return NextResponse.json({
      videos: videos,
      summary,
      message: 'Videos list',
    })
    
  } catch (error: any) {
    console.error('Error in debug endpoint:', error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
} 