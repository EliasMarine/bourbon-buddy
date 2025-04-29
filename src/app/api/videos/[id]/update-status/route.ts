import { NextResponse } from 'next/server'
// import { createClient } from '@/utils/supabase/server';
// import { muxClient } from '@/lib/mux'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  // Initialize Supabase client
  const supabase = await createClient();

  const params = await props.params;
  // Ensure params and params.id exist before using them
  const videoId = params?.id;
  if (!videoId) {
    console.error('[update-status] Missing video ID in request parameters');
    return NextResponse.json(
      { error: 'Missing video ID in request' },
      { status: 400 }
    );
  }

  console.log(`[update-status] Simplified route handler. Received video ID: ${videoId}`);

  // Immediately return the ID to test params access
  return NextResponse.json({ receivedVideoId: videoId });

  /*
  try {
    // Parse request body (optional)
    let requestBody = {};
    try {
      requestBody = await request.json();
    } catch (error) {
      console.warn('Invalid or missing request body, proceeding anyway');
      // Continue with empty body - not necessarily an error
    }
    
    // Get the video from the database
    const video = await (prisma as any).video.findUnique({
      where: { id: videoId }
    });
    
    if (!video) {
      console.warn(`[update-status] Video not found for ID: ${videoId}`);
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }
    
    // If there's no MUX upload ID, something is wrong with the video record
    if (!video.muxUploadId) {
      console.warn(`[update-status] Video ${videoId} is missing muxUploadId`);
      return NextResponse.json(
        { error: 'Video record is incomplete - missing upload ID' },
        { status: 400 }
      )
    }
    
    // If there's no MUX asset ID, we can't check status with MUX directly
    // but we can return the current status from our database
    if (!video.muxAssetId) {
      console.log(`[update-status] Video ${videoId} has uploadId ${video.muxUploadId} but no muxAssetId yet.`);
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
      console.log(`[update-status] MUX asset status for ${videoId} (${video.muxAssetId}): ${asset.status}`);
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
      console.error(`[update-status] Error checking MUX asset status for ${videoId}:`, error);
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
    console.error(`[update-status] Error updating video status for ${videoId}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
  */
} 