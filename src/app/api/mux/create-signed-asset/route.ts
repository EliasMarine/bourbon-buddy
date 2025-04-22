import { NextResponse } from 'next/server'
import { muxClient } from '@/lib/mux'
import { createMuxSignedPlaybackToken, createMuxSignedPlaybackUrl } from '@/lib/mux-token'

/**
 * Create a new MUX asset with a signed playback policy
 * This endpoint should be protected by your own authentication
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json()
    const { url, title, description } = body
    
    if (!url) {
      return NextResponse.json(
        { error: 'Video URL is required' },
        { status: 400 }
      )
    }
    
    // Create a new MUX asset with a "signed" playback policy
    const asset = await muxClient.video.assets.create({
      input: url,
      playback_policy: ['signed'],
      mp4_support: 'standard',
      ...(title && { passthrough: title }), // Add title as passthrough data
    })

    // Ensure the asset was created successfully
    if (!asset || !asset.id || !asset.playback_ids || asset.playback_ids.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create MUX asset' },
        { status: 500 }
      )
    }

    // Store asset info for later use
    const assetId = asset.id
    const playbackId = asset.playback_ids[0].id
    
    // Get the signing key from environment variables
    const signingKeyId = process.env.MUX_SIGNING_KEY_ID
    const privateKey = process.env.MUX_PRIVATE_KEY
    
    if (!signingKeyId || !privateKey) {
      console.error('Missing MUX signing credentials')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    // Create a signed JWT token valid for 24 hours
    const token = createMuxSignedPlaybackToken({
      playbackId,
      signingKeyId,
      privateKey,
      expirationTimeInSeconds: 24 * 60 * 60 // 24 hours
    })
    
    // Create a signed URL for the video
    const signedUrl = createMuxSignedPlaybackUrl({
      playbackId,
      token
    })
    
    // Return the asset details and signed URL
    return NextResponse.json({
      success: true,
      assetId,
      playbackId,
      signedUrl,
      token
    })
  } catch (error) {
    console.error('Error creating MUX asset with signed playback:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create MUX asset', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 