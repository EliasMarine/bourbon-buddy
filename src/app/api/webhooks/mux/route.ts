import { NextResponse } from 'next/server'
import { muxWebhookEventSchema } from '@/lib/mux'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

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

    const { type, data } = result.data
    
    // Handle different event types
    switch (type) {
      case 'video.asset.ready': {
        // Asset is ready for playback
        const assetId = data.id
        const playbackId = data.playback_ids?.[0]?.id

        if (playbackId) {
          console.log(`MUX Asset ${assetId} is ready with playback ID ${playbackId}`)
          
          // Update the video in the database with the playback ID
          try {
            const updatedVideo = await prisma.video.update({
              where: { muxAssetId: assetId },
              data: { 
                muxPlaybackId: playbackId,
                status: 'ready',
                duration: data.duration,
                aspectRatio: data.aspect_ratio
              }
            });
            console.log(`Updated video record for asset ${assetId}`);
          } catch (error) {
            console.error(`Failed to update video record for asset ${assetId}:`, error);
          }
        }
        break
      }
        
      case 'video.asset.errored': {
        // Asset has errored during processing
        const assetId = data.id
        console.error(`MUX Asset ${assetId} errored during processing`)
        
        // Update the video status to error
        try {
          const updatedVideo = await prisma.video.update({
            where: { muxAssetId: assetId },
            data: { status: 'error' }
          });
          console.log(`Updated video record status to error for asset ${assetId}`);
        } catch (error) {
          console.error(`Failed to update video record status for asset ${assetId}:`, error);
        }
        break
      }
      
      case 'video.upload.asset_created': {
        // This event fires when an asset is created from an upload
        // You might use this to update your database with the asset ID
        const uploadId = data.id
        console.log(`MUX Upload ${uploadId} has created an asset`)
        
        // Try to find the video by upload ID and update it with the asset ID
        try {
          const assetId = payload.data?.asset_id
          if (assetId) {
            const updatedVideo = await prisma.video.update({
              where: { muxUploadId: uploadId },
              data: { 
                muxAssetId: assetId,
                status: 'processing'
              }
            });
            console.log(`Updated video with asset ID ${assetId} for upload ${uploadId}`);
          }
        } catch (error) {
          console.error(`Failed to update video with asset ID for upload ${uploadId}:`, error);
        }
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