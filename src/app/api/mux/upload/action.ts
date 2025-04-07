'use server'

import { z } from 'zod'
import { createMuxUpload } from '@/lib/mux'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// Upload request validation schema
const uploadRequestSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  maxDurationSeconds: z.number().positive().max(3600).optional(),
  userId: z.string().optional(),
})

type ActionResponse = {
  success: boolean
  error?: string
  data?: {
    uploadId: string
    uploadUrl: string
  }
}

/**
 * Server action to create a new MUX upload
 * Returns a direct upload URL for the client to upload to
 */
export async function createVideoUpload(formData: FormData): Promise<ActionResponse> {
  try {
    // Parse and validate the form data
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const userId = formData.get('userId') as string
    const maxDurationSeconds = parseInt(formData.get('maxDurationSeconds') as string) || 3600
    
    const validatedData = uploadRequestSchema.parse({
      title,
      description,
      maxDurationSeconds,
      userId,
    })

    // Create a MUX upload
    const upload = await createMuxUpload({
      maxDurationSeconds: validatedData.maxDurationSeconds,
      // Store some metadata as passthrough for webhook identification
      passthrough: JSON.stringify({
        title: validatedData.title,
        userId: validatedData.userId
      }),
    })

    if (!upload || !upload.url) {
      return {
        success: false,
        error: 'Failed to create upload URL',
      }
    }

    // In a real application, you would store the upload in the database
    // Example (commented out since the video model doesn't exist yet):
    /*
    const videoRecord = await prisma.video.create({
      data: {
        title: validatedData.title,
        description: validatedData.description || '',
        muxUploadId: upload.id,
        status: 'uploading',
        userId: validatedData.userId,
      },
    })
    */

    // Return the upload URL to the client
    return {
      success: true,
      data: {
        uploadId: upload.id,
        uploadUrl: upload.url,
      },
    }
  } catch (error) {
    console.error('Error creating MUX upload:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Mark a video upload as complete
 */
export async function markUploadComplete(uploadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // In a real application, you would update the video status in the database
    // Example (commented out since the video model doesn't exist yet):
    /*
    await prisma.video.update({
      where: { muxUploadId: uploadId },
      data: { status: 'processing' },
    })
    */

    // Revalidate any relevant paths
    revalidatePath('/videos')
    
    return { success: true }
  } catch (error) {
    console.error('Error marking upload complete:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Delete a video and its MUX asset
 */
export async function deleteVideo(videoId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // In a real application, you would get the video from the database
    // Example (commented out since the video model doesn't exist yet):
    /*
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { muxAssetId: true },
    })

    if (!video) {
      return {
        success: false,
        error: 'Video not found',
      }
    }

    // Delete the video from the database
    await prisma.video.delete({
      where: { id: videoId },
    })
    */

    // If there's a MUX asset ID, delete it from MUX as well
    // This would typically use the deleteMuxAsset function from your MUX lib
    // await deleteMuxAsset(video.muxAssetId);

    // Revalidate any relevant paths
    revalidatePath('/videos')
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting video:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
} 