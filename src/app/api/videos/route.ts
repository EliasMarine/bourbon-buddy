import { NextResponse } from 'next/server'
import { supabaseAdmin, safeSupabaseQuery } from '@/lib/supabase-server'
import { nanoid } from 'nanoid'

// Define the Video interface to handle both camelCase and snake_case
interface Video {
  id: string
  title: string
  description: string | null
  status: string
  // Support both naming conventions
  mux_upload_id?: string | null
  muxUploadId?: string | null
  mux_asset_id?: string | null
  muxAssetId?: string | null
  mux_playback_id?: string | null
  muxPlaybackId?: string | null
  duration: number | null
  aspect_ratio?: string | null
  aspectRatio?: string | null
  thumbnail_time?: number | null
  thumbnailTime?: number | null
  user_id?: string | null
  userId?: string | null
  created_at?: Date
  createdAt?: Date
  updated_at?: Date
  updatedAt?: Date
  publicly_listed?: boolean
  publiclyListed?: boolean
  views: number
  user?: {
    name: string
    image: string
  }
}

// Function to check if a video needs syncing
function needsSync(video: Video): boolean {
  // Check if video is in processing state
  if (video.status === 'processing' || video.status === 'uploading') {
    return true;
  }
  
  // Check if video has a placeholder playback ID
  const playbackId = video.muxPlaybackId || video.mux_playback_id;
  if (playbackId && (
    playbackId.startsWith('placeholder-') || 
    playbackId.includes('sample-playback-id')
  )) {
    return true;
  }
  
  return false;
}

// Internal function to silently sync needed videos
async function syncVideosIfNeeded(videos: Video[]) {
  try {
    // Find videos that need syncing
    const videosToSync = videos.filter(needsSync);
    
    if (videosToSync.length === 0) {
      return; // Nothing to sync
    }
    
    console.log(`Auto-syncing ${videosToSync.length} videos that need updates`);
    
    // Trigger sync-status endpoint in the background
    const response = await fetch(new URL('/api/videos/sync-status', process.env.NEXTAUTH_URL || 'http://localhost:3000').toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn('Auto-sync background request failed, but continuing with current data');
    }
  } catch (error) {
    console.error('Error in automatic video sync:', error);
    // Fail silently - we'll still return the current data
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)
  const includeAllVideos = url.searchParams.get('includeAll') === 'true'
  const userId = url.searchParams.get('userId')
  
  try {
    console.log('GET /api/videos - Starting request')
    console.log(`Status filter: ${status || 'Not specified (using defaults)'}`)
    console.log(`Limit: ${limit}, includeAllVideos: ${includeAllVideos}`)
    if (userId) console.log(`Filtering for userId: ${userId}`)
    
    // Query the Video table directly with proper casing
    let query = supabaseAdmin
      .from('Video')  // Capital V, no quotes
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(Math.min(limit, 50))
    
    // Apply status filter - if no status provided, show all videos
    if (status) {
      query = query.eq('status', status)
    } else if (!includeAllVideos) {
      // Default to videos that are ready or processing only if not including all
      query = query.or('status.eq.ready,status.eq.processing')
    }
    
    // Filter by userId if provided
    if (userId) {
      query = query.eq('userId', userId)
    }
    
    // Only show publicly listed videos by default
    if (!includeAllVideos) {
      query = query.eq('publiclyListed', true)
    }
    
    console.log('Executing query to Video table')
    const { data: videos, error } = await query
    
    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }
    
    console.log(`Retrieved ${videos?.length || 0} videos from database`)
    
    // Trigger background sync if any videos need updating
    if (videos && videos.length > 0) {
      syncVideosIfNeeded(videos);
    }
    
    // Format the videos with consistent camelCase for the frontend
    // Make sure to handle missing playback IDs - include videos even without them
    const formattedVideos = (videos || []).map(video => {
      // Extract user info
      const userName = video.userId ? 
        (typeof video.userId === 'string' && video.userId.includes('@') ? 
          video.userId.split('@')[0] : 
          video.userId) : 
        'Unknown User'
      
      // Apply defaults for missing values
      return {
        ...video,
        // Ensure these fields are always present
        muxPlaybackId: video.muxPlaybackId || null,
        muxAssetId: video.muxAssetId || null,
        muxUploadId: video.muxUploadId || null,
        duration: video.duration || 0,
        aspectRatio: video.aspectRatio || '16:9',
        thumbnailTime: video.thumbnailTime || 0,
        // Add user object
        user: {
          name: userName,
          avatar: undefined
        }
      }
    })
    
    // Create response with cache control headers
    const response = NextResponse.json({ videos: formattedVideos })
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60')
    response.headers.set('CDN-Cache-Control', 'public, max-age=60')
    response.headers.set('Vercel-CDN-Cache-Control', 'public, max-age=60')
    
    return response
  } catch (error) {
    console.error('Error fetching videos:', error)
    const errorDetails = error instanceof Error ? 
      { message: error.message, stack: error.stack } : 
      { raw: String(error) }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch videos',
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, muxPlaybackId, userId } = await request.json()
    
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }
    
    try {
      // Create a new video record in Supabase with correct casing
      const { data: video, error } = await supabaseAdmin
        .from('Video')  // Capital V, no quotes
        .insert({
          title,
          description: description || '',
          muxPlaybackId: muxPlaybackId || null,
          status: muxPlaybackId ? 'ready' : 'uploading',
          userId,
          publiclyListed: true,
          views: 0
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      return NextResponse.json({ video })
    } catch (error) {
      console.error('Error creating video:', error)
      throw error
    }
  } catch (error) {
    console.error('Error creating video:', error)
    return NextResponse.json(
      { error: 'Failed to create video' },
      { status: 500 }
    )
  }
} 