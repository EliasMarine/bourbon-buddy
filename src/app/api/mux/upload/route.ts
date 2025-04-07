import { NextResponse } from 'next/server'
import { muxClient } from '@/lib/mux'

export async function POST(request: Request) {
  try {
    // Create a direct upload URL
    const upload = await muxClient.video.uploads.create({
      cors_origin: '*', // In production, replace with your domain
      new_asset_settings: {
        playback_policy: ['public'],
      },
    })

    return NextResponse.json({
      id: upload.id,
      url: upload.url,
    })
  } catch (error) {
    console.error('Error creating MUX upload:', error)
    return NextResponse.json(
      { error: 'Failed to create upload' },
      { status: 500 }
    )
  }
} 