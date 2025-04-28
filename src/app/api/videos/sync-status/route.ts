import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Mux from '@mux/mux-node';
import { revalidatePath } from 'next/cache';

// Initialize Mux client
const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || '',
  tokenSecret: process.env.MUX_TOKEN_SECRET || '',
});

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
);

/**
 * Middleware function to run before rendering video pages
 * This automatically fixes placeholder IDs and updates video status
 * by querying the actual Mux asset status
 */
export async function GET(request: Request) {
  // Extract videoId from URL query parameter if available
  const url = new URL(request.url);
  const videoId = url.searchParams.get('videoId');
  
  try {
    // Query videos with placeholder IDs or processing status
    const query = supabaseAdmin.from('Video').select('*');
    
    // If videoId is provided, only sync that specific video
    if (videoId) {
      query.eq('id', videoId);
    } else {
      // Otherwise sync all videos with placeholders or processing status
      query.or('status.eq.processing,muxPlaybackId.like.placeholder-%');
    }
    
    const { data: videosToUpdate, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching videos to update:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      );
    }

    if (!videosToUpdate || videosToUpdate.length === 0) {
      return NextResponse.json({ 
        message: 'No videos need updating',
        updated: 0 
      });
    }

    console.log(`Found ${videosToUpdate.length} videos to check/update`);
    let updatedCount = 0;

    // Process each video in parallel for better performance
    await Promise.all(videosToUpdate.map(async (video) => {
      const assetId = video.muxAssetId;
      
      // Skip videos without an asset ID (this should rarely happen)
      if (!assetId) {
        console.log(`Video ${video.id} has no Mux asset ID, skipping`);
        return;
      }

      try {
        // Check asset status with Mux API
        const asset = await muxClient.video.assets.retrieve(assetId);
        const assetStatus = asset.status;
        let needsUpdate = false;
        
        // Prepare update object
        const updateData: Record<string, any> = {};
        
        // Update status if it doesn't match
        if (video.status !== assetStatus) {
          updateData.status = assetStatus;
          needsUpdate = true;
        }
        
        // Handle playback ID - always prefer using real Mux playback IDs
        if (assetStatus === 'ready') {
          const hasPlaceholder = video.muxPlaybackId?.startsWith('placeholder-') || false;
          
          // Update playback ID if it's a placeholder or missing
          if (hasPlaceholder || !video.muxPlaybackId) {
            let actualPlaybackId;
            
            // Use existing playback ID from the asset if available
            if (asset.playback_ids && asset.playback_ids.length > 0) {
              actualPlaybackId = asset.playback_ids[0].id;
            } else {
              // Create a new playback ID if none exists
              const playbackResponse = await muxClient.video.assets.createPlaybackId(assetId, {
                policy: 'public'
              });
              actualPlaybackId = playbackResponse.id;
            }
            
            updateData.muxPlaybackId = actualPlaybackId;
            needsUpdate = true;
          }
          
          // Always update video metadata if the asset is ready
          updateData.duration = asset.duration || video.duration;
          updateData.aspectRatio = asset.aspect_ratio || video.aspectRatio;
        }
        
        // Only update if needed
        if (needsUpdate) {
          const { error: updateError } = await supabaseAdmin
            .from('Video')
            .update(updateData)
            .eq('id', video.id);

          if (updateError) {
            throw updateError;
          }
          
          updatedCount++;
          console.log(`Updated video ${video.id}: ${JSON.stringify(updateData)}`);
        }
      } catch (error) {
        console.error(`Error processing video ${video.id}:`, error);
      }
    }));

    // Revalidate relevant paths to update UI
    revalidatePath('/past-tastings');
    revalidatePath('/watch/[id]', 'page');
    if (videoId) {
      revalidatePath(`/watch/${videoId}`);
    }

    return NextResponse.json({
      message: `Checked ${videosToUpdate.length} videos, updated ${updatedCount}`,
      checked: videosToUpdate.length,
      updated: updatedCount
    });
  } catch (error) {
    console.error('Error syncing video statuses:', error);
    return NextResponse.json(
      { error: 'Failed to sync video statuses with Mux' },
      { status: 500 }
    );
  }
}

// Keep POST endpoint for compatibility and background jobs
export async function POST(request: Request) {
  return GET(request);
} 