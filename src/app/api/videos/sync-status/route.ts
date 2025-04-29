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

// Define the update result type
interface VideoUpdateResult {
  id: string;
  status: 'skipped' | 'no_asset_id' | 'status_updated' | 'playback_id_updated' | 'error';
  message?: string;
}

/**
 * Automatic background sync middleware to fix video statuses
 * This automatically fixes placeholder IDs and updates video status
 * by querying the actual Mux asset status without requiring user interaction
 */
export async function GET(request: Request) {
  // Extract videoId from URL query parameter if available
  const url = new URL(request.url);
  const videoId = url.searchParams.get('videoId');
  const isBackgroundSync = url.searchParams.get('background') === 'true';
  
  try {
    console.log(`Starting ${isBackgroundSync ? 'background' : 'manual'} video sync${videoId ? ` for video ${videoId}` : ''}`);
    
    // Query videos with placeholder IDs or processing status that might need updating
    // Set a cutoff time for uploads/processing to avoid checking very recent videos
    // - Processing videos that are too recent should be left alone (they might still be processing)
    const PROCESSING_CUTOFF_MINS = 5; // Only check videos that have been processing for more than 5 minutes
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - PROCESSING_CUTOFF_MINS);
    
    // Build the query with the proper filters
    let query = supabaseAdmin.from('Video').select('*');
    
    // If videoId is provided, only sync that specific video
    if (videoId) {
      query.eq('id', videoId);
    } else {
      // Query for videos in 'processing' state for more than 5 minutes
      // OR videos with placeholder playback IDs
      // Use simple or clause since the complex object syntax is causing type issues
      query.or('status.eq.processing,muxPlaybackId.like.placeholder-%,updatedAt.lt.' + cutoffTime.toISOString());
    }
    
    // Limit to a reasonable number to prevent overwhelming Mux API
    query.limit(20);

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
    const results: VideoUpdateResult[] = [];

    // Process each video in parallel for better performance
    await Promise.all(videosToUpdate.map(async (video) => {
      const assetId = video.muxAssetId;
      const result: VideoUpdateResult = { id: video.id, status: 'skipped' };
      
      // Skip videos without an asset ID (this should rarely happen)
      if (!assetId) {
        result.status = 'no_asset_id';
        results.push(result);
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
          result.status = 'status_updated';
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
            result.status = 'playback_id_updated';
          }
          
          // Always update video metadata if the asset is ready
          if (asset.duration && (!video.duration || video.duration !== asset.duration)) {
            updateData.duration = asset.duration;
            needsUpdate = true;
          }
          
          if (asset.aspect_ratio && (!video.aspectRatio || video.aspectRatio !== asset.aspect_ratio)) {
            updateData.aspectRatio = asset.aspect_ratio;
            needsUpdate = true;
          }
        }
        
        // Only update if needed
        if (needsUpdate) {
          const { error: updateError } = await supabaseAdmin
            .from('Video')
            .update(updateData)
            .eq('id', video.id);

          if (updateError) {
            result.status = 'error';
            result.message = updateError.message;
            throw updateError;
          }
          
          updatedCount++;
          console.log(`Updated video ${video.id}: ${JSON.stringify(updateData)}`);
        }
        
        results.push(result);
      } catch (error) {
        console.error(`Error processing video ${video.id}:`, error);
        result.status = 'error';
        result.message = error instanceof Error ? error.message : String(error);
        results.push(result);
      }
    }));

    // Revalidate relevant paths to update UI - don't do this for background sync
    // to avoid unnecessary revalidations that might impact performance
    if (!isBackgroundSync) {
      revalidatePath('/past-tastings');
      revalidatePath('/watch/[id]', 'page');
      if (videoId) {
        revalidatePath(`/watch/${videoId}`);
      }
    }

    return NextResponse.json({
      message: `Checked ${videosToUpdate.length} videos, updated ${updatedCount}`,
      checked: videosToUpdate.length,
      updated: updatedCount,
      results
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