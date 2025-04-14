import { NextResponse, NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
// Removed authOptions import - not needed with Supabase Auth;
import { prisma } from '@/lib/prisma';

// Proper way to extract ID in Next.js App Router
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: streamId } = params;
    console.log('Interactions API called for stream:', streamId);
    
    // Validate the streamId
    if (!streamId) {
      console.error('No stream ID provided');
      return NextResponse.json(
        { error: 'Missing stream ID' },
        { status: 400 }
      );
    }
    
    const user = await getCurrentUser();
    console.log('Current user:', user?.email || 'Not logged in');

    // Get total likes count
    const likesCount = await prisma.streamLike.count({
      where: { streamId },
    });
    
    console.log('Likes count for stream:', likesCount);

    // If user is not logged in, return only public data
    if (!user?.email) {
      return NextResponse.json({
        likes: likesCount,
        isLiked: false,
        isSubscribed: false,
      });
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!dbUser) {
      console.error('User not found in database:', user.email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get stream to check host
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      select: { hostId: true },
    });

    if (!stream) {
      console.error('Stream not found:', streamId);
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Check if user has liked the stream
    const like = await prisma.streamLike.findUnique({
      where: {
        streamId_userId: {
          streamId,
          userId: dbUser.id,
        },
      },
    });

    // Check if user is subscribed to the host
    const subscription = await prisma.streamSubscription.findUnique({
      where: {
        hostId_userId: {
          hostId: stream.hostId,
          userId: dbUser.id,
        },
      },
    });
    
    const result = {
      likes: likesCount,
      isLiked: !!like,
      isSubscribed: !!subscription,
    };
    
    console.log('Interaction result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Stream interactions GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 