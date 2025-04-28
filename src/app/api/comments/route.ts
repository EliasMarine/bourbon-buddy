import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { createSupabaseServerClient, safeSupabaseQuery, handleSupabaseError } from '@/lib/supabase-server';
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
      
      // Get Supabase client (SSR, with cookies)
      const supabase = await createSupabaseServerClient();
      
      // Check if the video exists
      const { data: video, error: videoError } = await safeSupabaseQuery(async () =>
        await supabase.from('Video').select('id').eq('id', validatedData.videoId).maybeSingle()
      );
      
      if (videoError || !video) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }
      
      // Insert the comment
      const { data: comment, error: commentError } = await safeSupabaseQuery(async () =>
        await supabase.from('Comment').insert({
            content: validatedData.content,
            videoId: validatedData.videoId,
            userId: user.id,
            reviewId: validatedData.reviewId || null,
        }).select('*, user:User(name, image)').maybeSingle()
      );
      
      if (commentError || !comment) {
        const { status, message } = handleSupabaseError(commentError, 'create comment');
        return NextResponse.json({ error: message }, { status });
      }
      
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
    
    // Get Supabase client (SSR, with cookies)
    const supabase = await createSupabaseServerClient();
    
    // Check if the video exists
    const { data: video, error: videoError } = await safeSupabaseQuery(async () =>
      await supabase.from('Video').select('id').eq('id', videoId).maybeSingle()
    );
    
    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }
    
    // Fetch comments for the video
    const { data: comments, error: commentsError } = await safeSupabaseQuery(async () =>
      await supabase.from('Comment')
        .select('*, user:User(name, image)')
        .eq('videoId', videoId)
        .order('created_at', { ascending: false })
    );
    
    if (commentsError) {
      const { status, message } = handleSupabaseError(commentsError, 'fetch comments');
      return NextResponse.json({ error: message }, { status });
    }
    
    return NextResponse.json(comments);
    
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 