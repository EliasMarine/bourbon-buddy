import Mux from '@mux/mux-node'
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
// Import from supabase-pages instead of supabase-server
import { createBrowserClient } from './supabase-pages'

// Try to directly load MUX credentials from .env.local
let muxTokenId = process.env.MUX_TOKEN_ID || ''
let muxTokenSecret = process.env.MUX_TOKEN_SECRET || ''

// Attempt to read .env.local directly if credentials are empty or we're in development
if ((muxTokenId === '' || muxTokenSecret === '' || process.env.NODE_ENV === 'development') && typeof window === 'undefined') {
  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local')
    const envLocalContent = fs.readFileSync(envLocalPath, 'utf8')
    
    // Extract MUX_TOKEN_ID
    const tokenIdMatch = envLocalContent.match(/MUX_TOKEN_ID=["']?(.*?)["']?$/m)
    if (tokenIdMatch && tokenIdMatch[1]) {
      muxTokenId = tokenIdMatch[1]
      process.env.MUX_TOKEN_ID = muxTokenId
      console.log('✅ Loaded MUX_TOKEN_ID from .env.local')
    }
    
    // Extract MUX_TOKEN_SECRET
    const tokenSecretMatch = envLocalContent.match(/MUX_TOKEN_SECRET=["']?(.*?)["']?$/m)
    if (tokenSecretMatch && tokenSecretMatch[1]) {
      muxTokenSecret = tokenSecretMatch[1]
      process.env.MUX_TOKEN_SECRET = muxTokenSecret
      console.log('✅ Loaded MUX_TOKEN_SECRET from .env.local')
    }
  } catch (error) {
    console.warn('⚠️ Could not load Mux credentials from .env.local:', error)
  }
}

/**
 * MUX client initialized with environment variables
 * This client allows interaction with MUX's API for video operations
 */
const muxClient = new Mux({
  tokenId: muxTokenId,
  tokenSecret: muxTokenSecret,
})

/**
 * Creates a new direct upload URL for uploading videos to MUX
 * @param options Configuration options for the upload
 * @returns The created upload with URL to directly upload to
 */
export async function createMuxUpload(options: {
  corsOrigin?: string
  maxDurationSeconds?: number
  passthrough?: string
}) {
  try {
    const upload = await muxClient.video.uploads.create({
      cors_origin: options.corsOrigin || '*', 
      new_asset_settings: {
        playback_policy: ['public'],
        ...(options.passthrough && { passthrough: options.passthrough }),
      },
    })
    
    return upload
  } catch (error) {
    console.error('Error creating MUX upload:', error)
    throw new Error('Failed to create video upload')
  }
}

/**
 * Gets information about a MUX asset by its ID
 * @param assetId The MUX asset ID
 * @returns The asset data or null if not found
 */
export async function getMuxAsset(assetId: string) {
  try {
    return await muxClient.video.assets.retrieve(assetId)
  } catch (error) {
    console.error(`Error retrieving MUX asset ${assetId}:`, error)
    return null
  }
}

/**
 * Deletes a MUX asset by its ID
 * @param assetId The MUX asset ID
 * @returns Success status
 */
export async function deleteMuxAsset(assetId: string) {
  try {
    await muxClient.video.assets.delete(assetId)
    return { success: true }
  } catch (error) {
    console.error(`Error deleting MUX asset ${assetId}:`, error)
    return { success: false, error }
  }
}

/**
 * Schema for MUX webhook events
 */
export const muxWebhookEventSchema = z.object({
  type: z.string(),
  object: z.object({
    type: z.string(),
    id: z.string(),
  }),
  data: z.object({
    id: z.string(),
    playback_ids: z.array(
      z.object({
        id: z.string(),
        policy: z.string(),
      })
    ).optional(),
    status: z.string().optional(),
    duration: z.number().optional(),
    aspect_ratio: z.string().optional(),
    max_stored_resolution: z.string().optional(),
    max_stored_frame_rate: z.number().optional(),
  }),
})

export type MuxWebhookEvent = z.infer<typeof muxWebhookEventSchema>

// Note: For webhook verification, refer to MUX documentation
// The webhooks.unwrap method requires special handling of headers
// that's difficult to type properly in TypeScript

/**
 * Manually set a MUX asset ID and create a playback ID for a video
 * This is useful when the webhook fails to update the video record
 */
export async function setMuxAssetIdAndCreatePlaybackId(videoId: string, muxAssetId: string) {
  try {
    // Validate that the asset ID exists in MUX
    const asset = await muxClient.video.assets.retrieve(muxAssetId);
    
    if (!asset) {
      throw new Error(`Asset ID ${muxAssetId} not found in MUX`);
    }
    
    // Create a new playback ID for the asset if one doesn't exist yet
    let playbackId = null;
    
    // Check if the asset already has a playback ID
    if (!asset.playback_ids || asset.playback_ids.length === 0) {
      // Create a new playback ID with public policy
      const playbackResponse = await muxClient.video.assets.createPlaybackId(muxAssetId, {
        policy: 'public'
      });
      
      // Extract the playback ID from the response
      playbackId = playbackResponse.id;
      console.log(`Created new playback ID: ${playbackId} for asset ${muxAssetId}`);
    } else {
      // Use the existing playback ID
      playbackId = asset.playback_ids[0].id;
      console.log(`Using existing playback ID: ${playbackId} for asset ${muxAssetId}`);
    }
    
    // Use createBrowserClient instead of supabaseAdmin
    const supabase = createBrowserClient();
    
    // Update the video record in Supabase with the asset ID and playback ID
    const { data: updatedVideo, error } = await supabase
      .from('video')
      .update({
        muxAssetId,
        muxPlaybackId: playbackId,
        status: asset.status || 'ready',
        duration: asset.duration,
        aspectRatio: asset.aspect_ratio
      })
      .eq('id', videoId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return {
      success: true,
      video: updatedVideo,
      assetId: muxAssetId,
      playbackId
    };
  } catch (error) {
    console.error(`Error setting MUX asset ID for video ${videoId}:`, error);
    throw error;
  }
}

/**
 * Gets the asset ID associated with a playback ID
 * @param playbackId The MUX playback ID
 * @returns The associated asset ID or null if not found
 */
export async function getAssetIdFromPlaybackId(playbackId: string): Promise<string | null> {
  try {
    // First, get the asset or live stream ID from the playback ID
    const playbackIdInfo = await muxClient.video.playbackIds.retrieve(playbackId);
    
    if (!playbackIdInfo || !playbackIdInfo.object) {
      return null;
    }
    
    return playbackIdInfo.object.id || null;
  } catch (error) {
    console.error(`Error retrieving asset ID for playback ID ${playbackId}:`, error);
    return null;
  }
}

/**
 * Deletes a MUX video asset by its ID
 * @param assetId The MUX asset ID to delete
 * @returns Result of the deletion operation
 */
export async function deleteMuxAssetById(assetId: string) {
  try {
    await muxClient.video.assets.delete(assetId);
    return { success: true };
  } catch (error) {
    console.error(`Error deleting MUX asset ${assetId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Updates a MUX video asset by its ID
 * @param assetId The MUX asset ID to update
 * @param passthrough Optional metadata to update
 * @returns The updated asset or null if not found/error
 */
export async function updateMuxAssetMetadata(assetId: string, passthrough: string) {
  try {
    const updatedAsset = await muxClient.video.assets.update(assetId, {
      passthrough
    });
    return { success: true, asset: updatedAsset };
  } catch (error) {
    console.error(`Error updating MUX asset ${assetId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Adds a new playback ID to an existing asset
 * @param assetId The MUX asset ID
 * @param policy The playback policy ('public' or 'signed')
 * @returns The newly created playback ID or error
 */
export async function addPlaybackIdToAsset(assetId: string, policy: 'public' | 'signed') {
  try {
    const result = await muxClient.video.assets.createPlaybackId(assetId, {
      policy
    });
    return { success: true, playbackId: result };
  } catch (error) {
    console.error(`Error adding playback ID to asset ${assetId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export { muxClient } 