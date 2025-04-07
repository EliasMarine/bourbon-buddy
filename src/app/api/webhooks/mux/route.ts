import { NextResponse } from 'next/server'
import { muxWebhookEventSchema } from '@/lib/mux'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    // Get the request body as text
    const body = await request.text()
    const signature = request.headers.get('mux-signature')
    
    // In production, you should verify the webhook signature
    // For now, we'll just parse the payload directly
    
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

    const { type, data } = result.data
    
    // Handle different event types
    switch (type) {
      case 'video.asset.ready': {
        // Asset is ready for playback
        const assetId = data.id
        const playbackId = data.playback_ids?.[0]?.id

        if (playbackId) {
          console.log(`MUX Asset ${assetId} is ready with playback ID ${playbackId}`)
          
          // Update your database with the playback ID
          // This is where you'd save the info to your database
          // For example:
          // await prisma.video.update({
          //   where: { muxAssetId: assetId },
          //   data: { 
          //     muxPlaybackId: playbackId,
          //     status: 'ready',
          //     duration: data.duration,
          //     aspectRatio: data.aspect_ratio
          //   }
          // })
        }
        break
      }
        
      case 'video.asset.errored': {
        // Asset has errored during processing
        const assetId = data.id
        console.error(`MUX Asset ${assetId} errored during processing`)
        
        // Update your database with the error status
        // For example:
        // await prisma.video.update({
        //   where: { muxAssetId: assetId },
        //   data: { status: 'error' }
        // })
        break
      }
      
      case 'video.upload.asset_created': {
        // This event fires when an asset is created from an upload
        // You might use this to update your database with the asset ID
        const uploadId = data.id
        console.log(`MUX Upload ${uploadId} has created an asset`)
        break
      }
        
      default: {
        // Log unhandled event types
        console.log(`Unhandled MUX webhook event: ${type}`)
      }
    }
    
    return NextResponse.json({ message: 'ok' })
  } catch (error) {
    console.error('Error processing MUX webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 