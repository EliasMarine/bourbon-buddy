import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { safePrismaQuery, prisma } from '@/lib/prisma-fix';
import { z } from 'zod';

// Schema for comment creation
const CommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment is too long'),
  videoId: z.string().min(1, 'Video ID is required'),
  reviewId: z.string().optional(),
});

// POST - Create a new comment
export async function POST(request: Request) {
  try {
    // Get the current user
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to comment.' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    
    try {
      // Validate the request body
      const validatedData = CommentSchema.parse(body);
      
      // Check if the video exists
      const video = await safePrismaQuery(() => 
        prisma.video.findUnique({
          where: { id: validatedData.videoId },
          select: { id: true }
        })
      );
      
      if (!video) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }
      
      // Create the comment
      const comment = await safePrismaQuery(() => 
        prisma.comment.create({
          data: {
            content: validatedData.content,
            videoId: validatedData.videoId,
            userId: user.id,
            reviewId: validatedData.reviewId || "placeholder-review-id",
          },
          include: {
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        })
      );
      
      return NextResponse.json(comment);
      
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }
  } catch (error) {
    console.error('Comment POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Fetch comments for a video
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the video exists
    const video = await safePrismaQuery(() => 
      prisma.video.findUnique({
        where: { id: videoId },
        select: { id: true }
      })
    );
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    // Fetch comments for the video
    const comments = await safePrismaQuery(() => 
      prisma.comment.findMany({
        where: { videoId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      })
    );
    
    return NextResponse.json(comments);
    
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 