"use server"

import { revalidatePath } from "next/cache"
import { getMuxAsset, deleteMuxAsset } from "@/lib/mux"
import { supabaseAdmin } from '@/lib/supabase-server'

export async function deleteVideoAction(formData: FormData) {
  const id = formData.get('id') as string

  if (!id) {
    return { error: 'Video ID is required' }
  }

  try {
    // Get the video to delete - using Video with capital V, no quotes
    const { data: video, error: findError } = await supabaseAdmin
      .from('Video')
      .select('muxAssetId, muxPlaybackId')
      .eq('id', id)
      .single()
    
    if (findError || !video) {
      console.error(`Error finding video ${id}:`, findError)
      return { error: 'Video not found', success: false }
    }

    // If there's a MUX asset ID, delete it from MUX first
    if (video.muxAssetId) {
      const assetInfo = await getMuxAsset(video.muxAssetId)
      if (assetInfo) {
        await deleteMuxAsset(video.muxAssetId)
        console.log(`Deleted MUX asset ${video.muxAssetId}`)
      }
    }

    // Delete the video from the database - using Video with capital V, no quotes
    const { error: deleteError } = await supabaseAdmin
      .from('Video')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      console.error(`Error deleting video ${id}:`, deleteError)
      return { error: 'Failed to delete video', success: false }
    }

    // Revalidate paths to update UI
    revalidatePath('/past-tastings')
    revalidatePath(`/watch/${id}`)

    return { success: true }
  } catch (error) {
    console.error('Error in delete video action:', error)
    return { 
      error: 'An unexpected error occurred', 
      success: false 
    }
  }
} 