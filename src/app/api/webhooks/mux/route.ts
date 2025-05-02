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
        // Asset is ready for playback
        const assetId = object.id;
        const playbackId = data.playback_ids?.[0]?.id;
        
        if (!assetId) {
          console.error('Missing asset ID in Mux webhook payload');
          return NextResponse.json({ error: 'Invalid webhook: missing asset ID' }, { status: 400 });
        }
        
        console.log(`Updating video with assetId ${assetId} to ready status with playbackId ${playbackId}`);
        
        const { data: video, error: findError } = await supabaseAdmin
          .from('Video')  // Using 'Video' with capital V
          .select('id')
          .eq('muxAssetId', assetId)
          .single();
          
        if (findError) {
          console.error(`Could not find video with muxAssetId ${assetId}:`, findError);
          
          // Log the error details
          console.error('Error details:', findError);
          
          // Try a more general query to see if the asset exists with any other ID
          console.log('Attempting to find video with any variation of the asset ID...');
          const { data: allVideos, error: queryError } = await supabaseAdmin
            .from('Video')
            .select('id, muxAssetId, muxUploadId')
            .limit(10);
            
          if (queryError) {
            console.error('Failed to query all videos:', queryError);
          } else {
            console.log(`Found ${allVideos?.length || 0} total videos:`, allVideos);
          }
          
          return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }
        
        const { error } = await supabaseAdmin
          .from('Video')  // Using 'Video' with capital V
          .update({ 
            status: 'ready',
            muxPlaybackId: playbackId,
            duration: data.duration || null,
            aspectRatio: data.aspect_ratio || null
          })
          .eq('muxAssetId', assetId);
          
        if (error) {
          console.error('Error updating video status:', error);
          return NextResponse.json({ error: 'Failed to update video' }, { status: 500 });
        }
        
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
        // This event fires when an asset is created from an upload
        const uploadId = data.id;
        console.log(`MUX Upload ${uploadId} has created an asset`);
        
        // Try to find the video by upload ID and update it with the asset ID in Supabase
        try {
          const assetId = payload.data?.asset_id;
          if (!assetId) {
            console.error('Missing asset_id in webhook payload');
            return NextResponse.json({ success: false, error: 'No asset ID in payload' });
          }
          
          // Only use the correct table name - 'Video' with capital V
          console.log(`Looking for video with muxUploadId = "${uploadId}"`);
          
          // IMPORTANT: Always use 'Video' with capital V to match your database schema
          const videoUpdateResult = await supabaseAdmin
            .from('Video') // Using 'Video' with capital V
            .update({ 
              muxAssetId: assetId,
              status: 'processing'
            })
            .eq('muxUploadId', uploadId)
            .select()
            .single();
            
          if (videoUpdateResult.error) {
            console.log('Error updating Video table:', videoUpdateResult.error);
            
            // If video record not found, create a new one
            console.log('Video record not found. Creating new record...');
            
            // Try to extract metadata from the passthrough
            let title = 'Untitled Video';
            let userId = null;
            try {
              if (payload.data.passthrough) {
                const metadata = JSON.parse(payload.data.passthrough);
                title = metadata.title || title;
                userId = metadata.userId;
              }
            } catch (e) {
              console.error('Error parsing passthrough metadata:', e);
            }
            
            // Generate a string ID that matches the schema
            const videoId = `video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            
            // IMPORTANT: Always use 'Video' with capital V to match your database schema
            const createResult = await supabaseAdmin
              .from('Video') // Using 'Video' with capital V
              .insert({
                id: videoId,
                title,
                muxUploadId: uploadId,
                muxAssetId: assetId,
                status: 'processing',
                userId,
                publiclyListed: true,
                views: 0
              })
              .select()
              .single();
              
            if (createResult.error) {
              console.error('Video creation failed:', createResult.error);
              return NextResponse.json({ error: 'Failed to create video record' }, { status: 500 });
            }
            
            console.log(`Successfully created new video record with ID: ${createResult.data.id}`);
            return NextResponse.json({ success: true, videoId: createResult.data.id });
          }
          
          console.log(`Updated video with asset ID ${assetId} for upload ${uploadId} in Supabase`);
          return NextResponse.json({ success: true, videoId: videoUpdateResult?.data?.id });
        } catch (error) {
          console.error(`Failed to update video with asset ID for upload ${uploadId}:`, error);
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
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