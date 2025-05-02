'use server'

import { z } from 'zod'
import { createMuxUpload } from '@/lib/mux'
import { supabaseAdmin, getColumnInfo, getTableNames } from '@/lib/supabase-server'
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

    // NEW: Additional validation for service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.length < 10) {
      console.error('❌ Missing or invalid SUPABASE_SERVICE_ROLE_KEY environment variable')
      return {
        success: false,
        error: 'Server configuration error: Missing service role key',
      }
    }
    
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
      console.log('Checking for existing video record...')
      
      const { data: existingVideo, error: queryError } = await supabaseAdmin
        .from('Video')
        .select('id')
        .eq('muxUploadId', upload.id)
        .maybeSingle()
      
      if (queryError) {
        console.error('❌ Error checking for existing video:', queryError)
        throw queryError
      }
      
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
      
      // Log the exact insert operation for debugging
      const insertData = {
        id: `video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // Provide a unique text ID as required by schema
        title: validatedData.title,
        description: validatedData.description || '',
        muxUploadId: upload.id,
        status: 'uploading',
        userId: validatedData.userId,
        publiclyListed: true,
        views: 0,
        muxPlaybackId: `placeholder-${upload.id}`,
        updatedAt: new Date().toISOString(), // Provide required updatedAt timestamp
      }
      
      console.log('Inserting video record with data (Manual ID & UpdatedAt):', JSON.stringify(insertData, null, 2))
      
      const { data: newVideo, error } = await supabaseAdmin
        .from('Video')
        .insert(insertData)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Failed to create video record in Supabase:', error)
        console.error('❌ Error details:', JSON.stringify(error, null, 2))
        
        // NEW: Try to identify specific errors
        if (error.message?.includes('not exist')) {
          console.error('❌ Table might not exist or has incorrect case')
        }
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          console.error('❌ Column name might be incorrect or has wrong case')
        }
        if (error.message?.includes('permission denied')) {
          console.error('❌ Permission denied - service role key might not have access')
        }
        
        // Try once more with a simpler insert that only includes essential fields
        console.log('Attempting simplified insert as fallback...')
        
        try {
          const simplifiedInsert = {
            id: `video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_fallback`, // Provide unique text ID
            title: insertData.title,
            status: 'uploading',
            muxUploadId: upload.id,
            userId: validatedData.userId,
            updatedAt: new Date().toISOString(), // Provide required updatedAt
          }
          
          console.log('Inserting simplified video record:', JSON.stringify(simplifiedInsert, null, 2))
          
          const { data: fallbackVideo, error: fallbackError } = await supabaseAdmin
            .from('Video')
            .insert(simplifiedInsert)
            .select()
            .single()
            
          if (fallbackError) {
            console.error('❌ Simplified insert also failed:', fallbackError)
            throw fallbackError
          }
          
          console.log(`✅ Successfully created video using simplified insert: ${fallbackVideo?.id}`)
          return {
            success: true,
            data: {
              uploadId: upload.id,
              uploadUrl: upload.url,
              videoId: fallbackVideo.id
            },
          }
        } catch (fallbackError) {
          console.error('❌ Fallback insert failed:', fallbackError)
          throw error
        }
      }
      
      console.log(`✅ Successfully created video record in Supabase with ID: ${newVideo?.id || 'unknown'}`)
      
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
 * Mark a video upload as complete - Attempts to find the video record with retries.
 */
export async function markUploadComplete(uploadId: string): Promise<{ success: boolean; error?: string; videoId?: string }> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1500;

  try {
    console.log(`🏁 Marking upload complete for upload ID: ${uploadId}`);

    if (!uploadId) {
      console.error('❌ uploadId is empty or undefined');
      return { success: false, error: 'Upload ID is required' };
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.length < 10) {
      console.error('❌ Missing or invalid SUPABASE_SERVICE_ROLE_KEY');
      return { success: false, error: 'Server configuration error: Missing service role key' };
    }

    let video: { id: string; title: string } | null = null;
    let findError: any = null;

    // Retry loop to find the video record
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`Attempt ${attempt}/${MAX_RETRIES}: Querying for video with muxUploadId: ${uploadId}`);
      const result = await supabaseAdmin
        .from('Video')
        .select('id, title')
        .eq('muxUploadId', uploadId)
        .single();

      if (result.data) {
        video = result.data;
        findError = null;
        console.log(`✅ Found video on attempt ${attempt}: ${video.id}`);
        break; // Exit loop if found
      } else {
        findError = result.error;
        console.warn(`⚠️ Video not found on attempt ${attempt}. Error:`, findError?.message);
        if (attempt < MAX_RETRIES) {
          console.log(`Waiting ${RETRY_DELAY_MS}ms before retrying...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }

    // If still not found after retries, handle error (maybe create recovery record)
    if (!video) {
      console.error(`❌ Failed to find video with upload ID ${uploadId} after ${MAX_RETRIES} attempts. Last error:`, findError);
      
      // Optionally: Add recovery logic here if needed, similar to before
      // For now, we just return an error indicating it wasn't found.
      return {
        success: false,
        error: `Video record not found for upload ID ${uploadId} after retries.`,
      };
    }

    console.log(`📋 Found video ${video.id} "${video.title}" for upload ID: ${uploadId}`);

    // Update the video status in the database - Set to 'processing' as MUX will handle 'ready'
    const { error: updateError } = await supabaseAdmin
      .from('Video')
      .update({
        status: 'processing', // Keep as processing, webhook will set to ready
        updatedAt: new Date().toISOString(),
      })
      .eq('muxUploadId', uploadId);

    if (updateError) {
      console.error(`❌ Failed to update video status for upload ID: ${uploadId}`, updateError);
      // Return success because we found the video, but note the update error
      return { success: true, videoId: video.id, error: 'Failed to update status to processing' };
    }

    console.log(`✅ Successfully updated video ${video.id} status to 'processing'`);

    // No need to trigger sync here, the webhook handles the final status update
    // Removed setTimeout and fetch call for sync-status

    // Revalidate paths
    revalidatePath('/past-tastings');
    revalidatePath(`/watch/${video.id}`);

    return { success: true, videoId: video.id };
  } catch (error) {
    console.error('Error in markUploadComplete:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in markUploadComplete',
    };
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