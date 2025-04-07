import Mux from '@mux/mux-node'
import { z } from 'zod'

/**
 * MUX client initialized with environment variables
 * This client allows interaction with MUX's API for video operations
 */
const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || '',
  tokenSecret: process.env.MUX_TOKEN_SECRET || '',
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

export { muxClient } 