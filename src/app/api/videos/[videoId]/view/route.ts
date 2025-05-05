import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
// import { Pool } from 'pg' // Removed - Not needed when using Supabase client
// import { config } from '@/lib/pg-config' // Removed - Not needed

// Initialize PostgreSQL pool (only if needed beyond Supabase)
// const pool = new Pool(config) // Removed - Not needed

/**
 * API Route to increment the view count for a video.
 * 
 * @param _request - The incoming request (unused).
 * @param params - The route parameters containing the videoId.
 * @returns NextResponse
 */
export async function POST(
  _request: Request, 
  { params }: { params: { videoId: string } }
) {
  const videoId = params.videoId

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
  }

  // Using Supabase client for the update
  const supabase = await createClient()

  try {
    // Fetch the current view count
    const { data: currentVideo, error: fetchError } = await supabase
      .from('Video')
      .select('views')
      .eq('id', videoId)
      .single()

    if (fetchError || !currentVideo) {
      console.error(`[API View Count] Error fetching video ${videoId}:`, fetchError)
      // Return 404 if video not found, or 500 for other errors
      return NextResponse.json(
        { error: fetchError?.code === 'PGRST116' ? 'Video not found' : 'Failed to fetch video data' },
        { status: fetchError?.code === 'PGRST116' ? 404 : 500 }
      )
    }

    // Increment the view count
    const newViewCount = (currentVideo.views || 0) + 1

    // Update the view count in the database
    const { error: updateError } = await supabase
      .from('Video')
      .update({ views: newViewCount })
      .eq('id', videoId)

    if (updateError) {
      console.error(`[API View Count] Error updating views for ${videoId}:`, updateError)
      return NextResponse.json({ error: 'Failed to update view count' }, { status: 500 })
    }

    console.log(`[API View Count] Incremented views for ${videoId} to ${newViewCount}`)
    // Successfully updated, return 204 No Content
    return new NextResponse(null, { status: 204 })
    
  } catch (error) {
    console.error(`[API View Count] Unexpected error for ${videoId}:`, error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
} 