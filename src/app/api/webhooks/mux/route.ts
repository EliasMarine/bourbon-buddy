import { NextResponse } from 'next/server'
import { muxWebhookEventSchema } from '@/lib/mux'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { muxClient } from '@/lib/mux'
import { revalidatePath } from 'next/cache'

// Create Supabase client with service role key for admin-level database operations
// This ensures the webhook can update records regardless of user authentication
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Never expose this key to the client
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Helper function to retrieve the Upload ID from a given Asset ID using Mux API
 */
async function getUploadIdFromAssetId(assetId: string): Promise<string | null> {
  try {
    console.log(`Helper: Querying Mux API for asset ${assetId} to get upload ID...`);
    const asset = await muxClient.video.assets.retrieve(assetId);
    // The upload ID is typically associated with the asset creation context
    // It might be directly on the asset or potentially in related upload info if available
    // Mux API documentation suggests checking asset.upload_id if it exists
    const uploadId = (asset as any)?.upload_id; // Use type assertion cautiously
    if (uploadId) {
      console.log(`Helper: Found upload ID ${uploadId} for asset ${assetId}`);
      return uploadId;
    }
    console.warn(`Helper: upload_id not found directly on asset ${assetId}`);
    return null;
  } catch (error) {
    console.error(`Helper: Error retrieving asset ${assetId} from Mux:`, error);
    return null;
  }
}

/**
 * MUX Webhook Handler
 * Processes incoming webhooks from MUX and updates video records in Supabase.
 * Handles various event types: video.asset.ready, video.asset.errored, etc.
 */
export async function POST(request: Request) {
  try {
    // Get the request body as text
    const body = await request.text()
    const signature = request.headers.get('mux-signature')
    
    // Verify the webhook signature
    if (!signature) {
      console.error('Missing MUX webhook signature')
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      )
    }

    const [timestampPart, signaturePart] = signature.split(',')
    const timestamp = timestampPart.split('=')[1]
    const expectedSignature = signaturePart.split('=')[1]

    // Check if the timestamp is within a reasonable time window (e.g., 5 minutes)
    const currentTime = Math.floor(Date.now() / 1000)
    const webhookTime = parseInt(timestamp, 10)
    if (Math.abs(currentTime - webhookTime) > 300) {
      console.error('MUX webhook timestamp out of acceptable range')
      return NextResponse.json(
        { error: 'Webhook timestamp out of range' },
        { status: 401 }
      )
    }

    // Compute the expected signature
    const signingSecret = process.env.MUX_WEBHOOK_SIGNING_SECRET || ''
    if (!signingSecret) {
      console.error('Missing MUX webhook signing secret')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const signedPayload = `${timestamp}.${body}`
    const computedSignature = crypto
      .createHmac('sha256', signingSecret)
      .update(signedPayload)
      .digest('hex')

    if (computedSignature !== expectedSignature) {
      console.error('Invalid MUX webhook signature')
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      )
    }
    
    // Parse the webhook payload
    const payload = JSON.parse(body)
    
    // Validate the payload against our schema
    const result = muxWebhookEventSchema.safeParse(payload)
    if (!result.success) {
      console.error('Invalid MUX webhook payload:', result.error)
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    const { type, data, object } = result.data
    
    // Handle different event types
    switch (type) {
      case 'video.asset.ready': {
        const assetId = object.id;
        const playbackId = data.playback_ids?.[0]?.id;
        const uploadId = (payload as any).data?.upload_id || (await getUploadIdFromAssetId(assetId)); 
        
        if (!assetId) {
          console.error('Webhook Error: Missing asset ID in video.asset.ready payload');
          return NextResponse.json({ error: 'Invalid webhook: missing asset ID' }, { status: 400 });
        }
        if (!playbackId) {
          console.warn(`Webhook Warning: Missing playback ID for asset ${assetId}. Video might not be playable yet.`);
          // Continue processing, but playback might fail later
        }
        
        console.log(`Webhook: video.asset.ready received for assetId: ${assetId}, trying to find video record...`);
        
        let video: { id: string } | null = null;
        let findError: any = null;

        // 1. Try finding by muxAssetId (ideal case)
        console.log(`  Attempt 1: Finding by muxAssetId = ${assetId}`);
        const findByAssetResult = await supabaseAdmin
          .from('Video')
          .select('id')
          .eq('muxAssetId', assetId)
          .single();
          
        if (findByAssetResult.data) {
          video = findByAssetResult.data;
          console.log(`  ✅ Found video by muxAssetId: ${video.id}`);
        } else {
          findError = findByAssetResult.error;
          console.warn(`  ⚠️ Video not found by muxAssetId (${assetId}). Error: ${findError?.message}. Trying by muxUploadId...`);

          // 2. Try finding by muxUploadId (fallback for timing issues)
          if (uploadId) {
            console.log(`  Attempt 2: Finding by muxUploadId = ${uploadId}`);
            const findByUploadResult = await supabaseAdmin
              .from('Video')
              .select('id')
              .eq('muxUploadId', uploadId)
              .single();

            if (findByUploadResult.data) {
              video = findByUploadResult.data;
              console.log(`  ✅ Found video by muxUploadId: ${video.id}`);
              // IMPORTANT: Update the record with the assetId now that we've found it
              console.log(`  Updating video ${video.id} with muxAssetId ${assetId}...`);
              const { error: updateAssetIdError } = await supabaseAdmin
                .from('Video')
                .update({ muxAssetId: assetId })
                .eq('id', video.id);
              if (updateAssetIdError) {
                console.error(`  ❌ Failed to update muxAssetId for video ${video.id}:`, updateAssetIdError);
                // Continue anyway, but log the error
              }
            } else {
              findError = findByUploadResult.error;
              console.error(`  ❌ Video not found by muxUploadId (${uploadId}) either. Error: ${findError?.message}`);
            }
          } else {
            console.warn('  ⚠️ Cannot search by muxUploadId because it was not present in the webhook payload.');
          }
        }
          
        // If still not found after both attempts
        if (!video) {
          console.error(`Webhook Error: Could not find video record for assetId ${assetId} or uploadId ${uploadId}.`);
          return NextResponse.json({ error: 'Video database record not found' }, { status: 404 });
        }
        
        // Proceed with updating the status and playback details
        console.log(`Updating video ${video.id} status to ready...`);
        const { error: updateStatusError } = await supabaseAdmin
          .from('Video')
          .update({ 
            status: 'ready',
            muxPlaybackId: playbackId, // Use the received playbackId
            duration: data.duration || null,
            aspectRatio: data.aspect_ratio || null,
            updatedAt: new Date().toISOString() // Also update timestamp
          })
          .eq('id', video.id); // Use the primary key for the final update
          
        if (updateStatusError) {
          console.error(`Webhook Error: Failed to update video ${video.id} status/playback:`, updateStatusError);
          return NextResponse.json({ error: 'Failed to update video details' }, { status: 500 });
        }
        
        console.log(`✅ Webhook: Successfully processed video.asset.ready for video ${video.id}`);
        
        // Revalidate relevant paths to update UI
        revalidatePath('/past-tastings');
        revalidatePath('/watch/[id]', 'page');
        if (video?.id) {
          revalidatePath(`/watch/${video.id}`);
        }
        
        return NextResponse.json({ success: true, videoId: video?.id });
      }
        
      case 'video.asset.errored': {
        // Asset has errored during processing
        const assetId = object.id;
        console.error(`MUX Asset ${assetId} errored during processing`);
        
        // Update the video status to error in Supabase
        try {
          const { error } = await supabaseAdmin
            .from('Video') // Using 'Video' with capital V
            .update({ status: 'error' })
            .eq('muxAssetId', assetId);
          
          if (error) {
            console.error('Error updating video error status:', error);
            return NextResponse.json({ error: 'Failed to update video status' }, { status: 500 });
          }
          
          return NextResponse.json({ success: true });
        } catch (error) {
          console.error(`Failed to update video status for asset ${assetId}:`, error);
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
      }
      
      case 'video.upload.asset_created': {
        const uploadId = data.id;
        const assetId = payload.data?.asset_id;
        
        console.log(`Webhook: video.upload.asset_created received for uploadId: ${uploadId}, assetId: ${assetId}`);

        if (!assetId) {
          console.error('Webhook Error: Missing asset_id in video.upload.asset_created payload');
          return NextResponse.json({ success: false, error: 'No asset ID in payload' });
        }
        if (!uploadId) {
          console.error('Webhook Error: Missing uploadId in video.upload.asset_created payload');
          return NextResponse.json({ success: false, error: 'No upload ID in payload' });
        }
        
        // Find the video by upload ID and update it with the asset ID
        console.log(`  Looking for video with muxUploadId = "${uploadId}" to update assetId.`);
        
        const { data: updatedVideo, error: updateError } = await supabaseAdmin
          .from('Video')
          .update({ 
            muxAssetId: assetId,
            status: 'processing', // Asset created, Mux starts processing
            updatedAt: new Date().toISOString()
          })
          .eq('muxUploadId', uploadId)
          .select('id') // Select the ID to confirm which record was updated
          .single();
            
        if (updateError) {
          console.error(`Webhook Error: Failed to update video record for uploadId ${uploadId} with assetId ${assetId}. Error:`, updateError);
          // Don't create a new record here, as the original insert should have worked.
          // If it fails, the video.asset.ready webhook might still find it via uploadId later.
          return NextResponse.json({ error: 'Failed to find/update video record from uploadId' }, { status: 404 }); // Return 404 if update failed
        }
        
        console.log(`✅ Webhook: Successfully updated video ${updatedVideo.id} with assetId ${assetId} for upload ${uploadId}`);
        return NextResponse.json({ success: true, videoId: updatedVideo.id });
      }
        
      default: {
        // Log unhandled event types
        console.log(`Unhandled MUX webhook event: ${type}`);
        return NextResponse.json({ received: true, type });
      }
    }
  } catch (error) {
    console.error('Error processing MUX webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 