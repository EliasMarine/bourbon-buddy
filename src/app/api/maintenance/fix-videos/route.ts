import { NextRequest, NextResponse } from 'next/server'
import { checkAndFixMuxPlaybackIds } from '@/lib/fix-videos'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

/**
 * API endpoint to check and fix videos with missing Mux playback IDs
 * @param request The request object
 * @returns JSON response with results
 */
export async function GET(request: NextRequest) {
  try {
    // Check for admin authorization (simple API key check)
    const headersList = await headers()
    const apiKey = headersList.get('x-api-key')
    
    if (!apiKey || apiKey !== process.env.MAINTENANCE_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get the video ID from query params if provided
    const url = new URL(request.url)
    const videoId = url.searchParams.get('videoId') || undefined
    
    // Run the fix function
    const results = await checkAndFixMuxPlaybackIds(videoId)
    
    // Revalidate any paths that might show videos
    revalidatePath('/videos')
    revalidatePath('/watch')
    
    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fixing videos:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
} 