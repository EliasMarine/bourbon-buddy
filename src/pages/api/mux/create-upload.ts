import { NextApiRequest, NextApiResponse } from 'next'
import Mux from '@mux/mux-node'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get video details from request body
  const { title = 'Untitled Video', description = '', userId } = req.body

  // Generate a unique ID for the video
  const videoId = nanoid()

  try {
    // Create a new upload URL in MUX
    const upload = await muxClient.video.uploads.create({
      cors_origin: '*', 
      new_asset_settings: {
        playback_policy: ['public'],
        passthrough: videoId, // Store the video ID in MUX for webhook handling
      },
    })
    
    if (!upload || !upload.url) {
      throw new Error('Failed to create upload URL from MUX service')
    }
    
    // Create a record in the Supabase Video table
    const { data: video, error } = await supabase
      .from('Video')
      .insert({
        id: videoId,
        title,
        description,
        userId,
        status: 'uploading',
        muxUploadId: upload.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating video record in Supabase:', error)
      throw new Error('Failed to create video record')
    }
    
    // Return the upload URL, IDs, and video record
    return res.status(200).json({
      url: upload.url,
      muxUploadId: upload.id,
      videoId,
      video
    })
  } catch (error) {
    console.error('Error creating MUX upload:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create video upload'
    })
  }
} 