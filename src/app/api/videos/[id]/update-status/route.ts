import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { muxClient } from '@/lib/mux'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params.id is fully resolved before using it
    const videoId = await Promise.resolve(params.id);
    
    // Use videoId instead of params.id for the rest of the function
    const body = await request.json();
    const { status } = body;
    
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }
    
    // Get the video from the database
    const video = await (prisma as any).video.findUnique({
      where: { id: videoId }
    });
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }
    
    // If there's no MUX upload ID, something is wrong with the video record
    if (!video.muxUploadId) {
      return NextResponse.json(
        { error: 'Video record is incomplete - missing upload ID' },
        { status: 400 }
      )
    }
    
    // If there's no MUX asset ID, we can't check status with MUX directly
    // but we can return the current status from our database
    if (!video.muxAssetId) {
      return NextResponse.json(
        { 
          error: 'Video does not have a MUX asset ID',
          status: video.status,
          message: 'MUX is still processing the initial upload. Please try again later.',
          uploadId: video.muxUploadId
        },
        { status: 400 }
      )
    }
    
    try {
      // Check the status with MUX API
      const asset = await muxClient.video.assets.retrieve(video.muxAssetId)
      
      // Update the video status in the database
      const updatedVideo = await (prisma as any).video.update({
        where: { id: videoId },
        data: { 
          status: asset.status,
          // Also update other properties if available
          duration: asset.duration || video.duration,
          aspectRatio: asset.aspect_ratio || video.aspectRatio,
          // If the asset is ready but we don't have a playback ID, get it
          ...(asset.status === 'ready' && !video.muxPlaybackId && asset.playback_ids?.length 
            ? { muxPlaybackId: asset.playback_ids[0].id } 
            : {})
        }
      })
      
      return NextResponse.json({ 
        success: true,
        status: updatedVideo.status,
        playable: updatedVideo.status === 'ready' && updatedVideo.muxPlaybackId ? true : false
      })
    } catch (error) {
      console.error('Error checking MUX asset status:', error)
      return NextResponse.json(
        { 
          error: 'Failed to check video status with MUX',
          originalStatus: video.status,
          muxError: error instanceof Error ? error.message : 'Unknown MUX error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error updating video status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 