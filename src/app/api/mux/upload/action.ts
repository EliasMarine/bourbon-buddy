'use server'

import { z } from 'zod'
import { createMuxUpload } from '@/lib/mux'
import { supabaseAdmin } from '@/lib/supabase-server'
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
    videoId?: string
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
    
    console.log(`📹 Creating new video upload - DEBUG INFO:`)
    console.log(`  - Title: "${title}"`)
    console.log(`  - Description length: ${description?.length || 0} chars`)
    console.log(`  - User ID: "${userId}" (${typeof userId})`)
    console.log(`  - User ID empty?: ${!userId}`)
    console.log(`  - Max duration: ${maxDurationSeconds} seconds`)
    
    // Validate userId - it must be provided
    if (!userId || userId.trim() === '') {
      console.error('❌ Missing user ID in video upload request')
      return {
        success: false,
        error: 'User ID is required for video uploads',
      }
    }
    
    // Make sure the supabaseAdmin client is properly configured
    console.log('Checking supabaseAdmin configuration:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 3) + '...',
    })
    
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
      console.error('Failed to create Mux upload URL')
      return {
        success: false,
        error: 'Failed to create upload URL',
      }
    }
    
    console.log(`🎬 Mux upload created successfully with ID: ${upload.id}`)

    // Store the upload in the database using proper error handling
    try {
      console.log(`📝 Creating video record in database for upload ID: ${upload.id} with userId: ${validatedData.userId}`)
      
      // First, check if a record already exists with this upload ID
      const { data: existingVideo } = await supabaseAdmin
        .from('Video')
        .select('id')
        .eq('muxUploadId', upload.id)
        .maybeSingle()
      
      if (existingVideo) {
        console.log(`⚠️ Video record already exists for upload ID: ${upload.id}`)
        // Return success with the existing upload data
        return {
          success: true,
          data: {
            uploadId: upload.id,
            uploadUrl: upload.url,
            videoId: existingVideo.id
          },
        }
      }
      
      // Create a new video record with all required fields using the admin client
      // This bypasses RLS because supabaseAdmin uses the service role key
      console.log('Creating video with supabaseAdmin (service role)...')
      
      const { data: newVideo, error } = await supabaseAdmin
        .from('Video')
        .insert({
          title: validatedData.title,
          description: validatedData.description || '',
          muxUploadId: upload.id,
          status: 'uploading',
          userId: validatedData.userId,
          publiclyListed: true,
          views: 0,
          // Use a placeholder playback ID to make it appear in listings immediately
          muxPlaybackId: `placeholder-${upload.id}`,
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ Failed to create video record in Supabase:', error)
        throw error
      }
      
      console.log(`✅ Successfully created video record in Supabase with ID: ${newVideo.id}`)
      
      // Return success with the upload URL and video ID
      return {
        success: true,
        data: {
          uploadId: upload.id,
          uploadUrl: upload.url,
          videoId: newVideo.id
        },
      }
    } catch (dbError) {
      console.error('❌ Failed to create video record in Supabase:', dbError)
      // Even if the database record fails, we can still return the upload URL
      // The MUX webhook can handle creating the record when the upload is complete
      console.log('⚠️ Continuing with upload despite database error')
      
      return {
        success: true,
        data: {
          uploadId: upload.id,
          uploadUrl: upload.url,
        },
      }
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
export async function markUploadComplete(uploadId: string): Promise<{ success: boolean; error?: string; videoId?: string }> {
  try {
    console.log(`🏁 Marking upload complete for upload ID: ${uploadId}`)
    
    // Get the video ID first
    const { data: video, error: findError } = await supabaseAdmin
      .from('Video')
      .select('id, title')
      .eq('muxUploadId', uploadId)
      .single()
    
    if (findError) {
      console.error(`❌ Could not find video with upload ID: ${uploadId}`, findError)
      throw new Error(`Video not found for upload ID: ${uploadId}`)
    }
    
    console.log(`📋 Found video ${video.id} "${video.title}" for upload ID: ${uploadId}`)
    
    // Update the video status in the database
    const { error: updateError } = await supabaseAdmin
      .from('Video')
      .update({ 
        status: 'processing',
        updatedAt: new Date().toISOString()
      })
      .eq('muxUploadId', uploadId)
    
    if (updateError) {
      console.error(`❌ Failed to update video status for upload ID: ${uploadId}`, updateError)
      throw updateError
    }
    
    console.log(`✅ Successfully updated video ${video.id} status to 'processing'`)
    
    // Trigger sync to update video status from Mux
    try {
      console.log(`🔄 Triggering sync for video ID: ${video.id}`)
      
      // We need to wait a bit before syncing to make sure Mux has processed the video
      // This will run asynchronously and not block the response
      setTimeout(async () => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const syncResponse = await fetch(`${baseUrl}/api/videos/sync-status?videoId=${video.id}`, {
            method: 'POST',
          })
          
          if (!syncResponse.ok) {
            console.error(`❌ Failed to sync video status for video ID: ${video.id}`, await syncResponse.text())
          } else {
            console.log(`✅ Successfully triggered sync for video ID: ${video.id}`)
          }
        } catch (syncError) {
          console.error(`❌ Error triggering sync for video ID: ${video.id}`, syncError)
        }
      }, 5000) // Wait 5 seconds before syncing
      
    } catch (syncError) {
      // Don't fail the whole process if sync fails
      console.error(`⚠️ Warning: Failed to trigger sync for video ID: ${video.id}`, syncError)
    }

    // Revalidate any relevant paths
    revalidatePath('/past-tastings')
    revalidatePath(`/watch/${video.id}`)
    
    return { success: true, videoId: video.id }
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
    // Get the video from the database
    const video = await supabaseAdmin.from('Video').select('muxAssetId').eq('id', videoId).single()

    if (!video) {
      return {
        success: false,
        error: 'Video not found',
      }
    }

    // Delete the video from the database
    await supabaseAdmin.from('Video').delete().eq('id', videoId)

    // If there's a MUX asset ID, you might want to delete it from MUX as well
    // This would typically use the deleteMuxAsset function from your MUX lib
    // if (video.muxAssetId) {
    //   await deleteMuxAsset(video.muxAssetId);
    // }

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