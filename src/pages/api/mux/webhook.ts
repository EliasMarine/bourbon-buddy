import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import Mux from '@mux/mux-node'
import { buffer } from 'micro'

// Disable body parsing, need the raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
}

// Initialize MUX client with environment variables
const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || '',
  tokenSecret: process.env.MUX_TOKEN_SECRET || '',
})

// Initialize Supabase admin client (server-side only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the raw request body
    const rawBody = await buffer(req)
    
    // Get the MUX signature from the headers
    const signature = req.headers['mux-signature'] as string
    
    // Verify the webhook signature using the correct method from MUX SDK
    let event
    try {
      // Convert buffer to string for parsing
      const bodyString = rawBody.toString()
      event = JSON.parse(bodyString)
      
      // Skip signature verification in development for easier testing
      if (process.env.NODE_ENV !== 'development') {
        const isValid = muxClient.webhooks.verify(
          bodyString,
          signature,
          process.env.MUX_WEBHOOK_SECRET || ''
        )
        
        if (!isValid) {
          throw new Error('Invalid signature')
        }
      }
    } catch (error) {
      console.error('Failed to verify MUX webhook signature:', error)
      return res.status(403).json({ error: 'Invalid signature' })
    }
    
    // Handle different webhook events
    switch(event.type) {
      case 'video.asset.ready': {
        // Video is ready to stream
        await handleAssetReady(event.data)
        break
      }
      case 'video.asset.created': {
        // Asset was created, update the record
        await handleAssetCreated(event.data)
        break
      }
      case 'video.upload.cancelled': {
        // Upload was cancelled, update status
        await handleUploadCancelled(event.data)
        break
      }
      case 'video.asset.errored': {
        // Asset encountered an error, update status
        await handleAssetError(event.data)
        break
      }
    }
    
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error handling MUX webhook:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process webhook'
    })
  }
}

async function handleAssetReady(data: any) {
  const assetId = data.id
  const playbackId = data.playback_ids?.[0]?.id
  const videoId = data.passthrough // Retrieve the video ID we stored in passthrough
  
  if (!videoId) {
    console.error('No video ID found in passthrough for asset:', assetId)
    return
  }
  
  // Update the video record with asset details
  const { error } = await supabase
    .from('Video')
    .update({
      status: 'ready',
      muxAssetId: assetId,
      muxPlaybackId: playbackId,
      duration: data.duration,
      aspectRatio: data.aspect_ratio,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', videoId)
  
  if (error) {
    console.error('Failed to update video status in Supabase:', error)
    throw error
  }
  
  console.log(`Updated video ${videoId} with MUX asset ${assetId}`)
}

async function handleAssetCreated(data: any) {
  const assetId = data.id
  const videoId = data.passthrough
  
  if (!videoId) {
    console.error('No video ID found in passthrough for asset:', assetId)
    return
  }
  
  // Update the video record with the asset ID
  const { error } = await supabase
    .from('Video')
    .update({
      status: 'processing',
      muxAssetId: assetId,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', videoId)
  
  if (error) {
    console.error('Failed to update video with asset ID in Supabase:', error)
    throw error
  }
  
  console.log(`Updated video ${videoId} with MUX asset ID ${assetId}`)
}

async function handleUploadCancelled(data: any) {
  const uploadId = data.id
  
  // Find the video with this upload ID
  const { data: videos, error: findError } = await supabase
    .from('Video')
    .select('id')
    .eq('muxUploadId', uploadId)
    .limit(1)
  
  if (findError || !videos || videos.length === 0) {
    console.error('Failed to find video with upload ID:', uploadId)
    return
  }
  
  const videoId = videos[0].id
  
  // Update the video status
  const { error } = await supabase
    .from('Video')
    .update({
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', videoId)
  
  if (error) {
    console.error('Failed to update video status to cancelled:', error)
    throw error
  }
  
  console.log(`Updated video ${videoId} status to cancelled`)
}

async function handleAssetError(data: any) {
  const assetId = data.id
  const videoId = data.passthrough
  
  if (!videoId) {
    // Try to find by asset ID if passthrough is not available
    const { data: videos, error: findError } = await supabase
      .from('Video')
      .select('id')
      .eq('muxAssetId', assetId)
      .limit(1)
    
    if (findError || !videos || videos.length === 0) {
      console.error('Failed to find video with asset ID:', assetId)
      return
    }
    
    const foundVideoId = videos[0].id
    
    // Update the video status
    const { error } = await supabase
      .from('Video')
      .update({
        status: 'error',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', foundVideoId)
    
    if (error) {
      console.error('Failed to update video status to error:', error)
      throw error
    }
    
    console.log(`Updated video ${foundVideoId} status to error`)
    return
  }
  
  // Update the video status using the passthrough ID
  const { error } = await supabase
    .from('Video')
    .update({
      status: 'error',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', videoId)
  
  if (error) {
    console.error('Failed to update video status to error:', error)
    throw error
  }
  
  console.log(`Updated video ${videoId} status to error`)
} 