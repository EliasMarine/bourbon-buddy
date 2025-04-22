import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Define the Video interface to match the database schema
interface Video {
  id: string
  title: string
  description: string | null
  status: string
  muxUploadId: string | null
  muxAssetId: string | null
  muxPlaybackId: string | null
  duration: number | null
  aspectRatio: string | null
  thumbnailTime: number | null
  userId: string | null
  createdAt: Date
  updatedAt: Date
  publiclyListed: boolean
  views: number
  user?: {
    name: string
    image: string
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)
  
  try {
    const whereClause: any = {}
    
    // Filter by status if provided
    if (status) {
      whereClause.status = status
    } else {
      // Default to videos that are ready or processing
      whereClause.OR = [
        { status: 'ready' },
        { status: 'processing' }
      ]
    }
    
    // Only show publicly listed videos
    whereClause.publiclyListed = true
    
    // Debug to see if the model exists at all
    console.log('Available models in Prisma client:', Object.keys(prisma));
    
    try {
      // Attempt to find videos
      const videos = await (prisma as any).video.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        take: Math.min(limit, 50) // Limit to maximum 50 videos
      }) as Video[];
      
      // Format user data manually since we don't have a direct relation in the schema
      const formattedVideos = (videos || []).map(video => {
        return {
          ...video,
          user: video.userId ? {
            name: video.userId.split('@')[0] || 'User', // Create a username from email or ID
            avatar: undefined // No avatar data available
          } : undefined
        };
      });
      
      // Create a response with cache control headers to prevent excessive requests
      const response = NextResponse.json({ videos: formattedVideos });
      
      // Add cache headers - cache for 60 seconds to avoid constant rerequests
      response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60');
      response.headers.set('CDN-Cache-Control', 'public, max-age=60');
      response.headers.set('Vercel-CDN-Cache-Control', 'public, max-age=60');
      
      return response;
    } catch (error) {
      console.error('Error with video model access:', error);
      // Return empty array as fallback
      return NextResponse.json({ videos: [] });
    }
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, muxPlaybackId, userId } = await request.json()
    
    if (!title || !muxPlaybackId) {
      return NextResponse.json(
        { error: 'Title and playback ID are required' },
        { status: 400 }
      )
    }
    
    try {
      // Attempt to create a video
      const video = await (prisma as any).video.create({
        data: {
          title,
          description: description || '',
          muxPlaybackId,
          status: 'ready',
          userId
        }
      }) as Video;
      
      return NextResponse.json({ video });
    } catch (error) {
      console.error('Error creating video:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error creating video:', error)
    return NextResponse.json(
      { error: 'Failed to create video' },
      { status: 500 }
    )
  }
} 