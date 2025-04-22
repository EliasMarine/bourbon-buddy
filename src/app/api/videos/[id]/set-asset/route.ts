import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { setMuxAssetIdAndCreatePlaybackId } from '@/lib/mux'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    // Ensure params is fully resolved
    const videoId = await Promise.resolve(params.id)
    
    // Get the request body
    const body = await request.json()
    const { muxAssetId } = body
    
    if (!muxAssetId) {
      return NextResponse.json(
        { error: 'MUX asset ID is required' },
        { status: 400 }
      )
    }
    
    // Get the video from the database
    const video = await (prisma as any).video.findUnique({
      where: { id: videoId }
    })
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }
    
    // Set the MUX asset ID and create a playback ID
    try {
      const result = await setMuxAssetIdAndCreatePlaybackId(videoId, muxAssetId)
      
      return NextResponse.json({
        success: true,
        video: result.video,
        assetId: result.assetId,
        playbackId: result.playbackId
      })
    } catch (error) {
      console.error('Error setting MUX asset ID:', error)
      return NextResponse.json(
        { 
          error: 'Failed to set MUX asset ID',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error handling request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 