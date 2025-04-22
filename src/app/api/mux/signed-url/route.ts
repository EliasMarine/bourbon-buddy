import { NextResponse } from 'next/server'
import { createMuxSignedPlaybackToken, createMuxSignedPlaybackUrl } from '@/lib/mux-token'
import { getAssetIdFromPlaybackId } from '@/lib/mux'

/**
 * Create a signed MUX URL for secure video playback
 * This endpoint should be protected by your own authentication
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json()
    const { playbackId } = body
    
    if (!playbackId) {
      return NextResponse.json(
        { error: 'Playback ID is required' },
        { status: 400 }
      )
    }
    
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
    const url = createMuxSignedPlaybackUrl({
      playbackId,
      token
    })
    
    // Get the asset ID associated with this playback ID
    const assetId = await getAssetIdFromPlaybackId(playbackId)
    
    return NextResponse.json({
      url,
      token,
      playbackId,
      assetId
    })
  } catch (error) {
    console.error('Error creating signed URL:', error)
    return NextResponse.json(
      { error: 'Failed to create signed URL' },
      { status: 500 }
    )
  }
} 