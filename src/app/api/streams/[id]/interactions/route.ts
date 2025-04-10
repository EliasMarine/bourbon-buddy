import { NextResponse, NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { PrismaClient } from '@prisma/client';
// Removed authOptions import - not needed with Supabase Auth;
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const streamId = request.nextUrl.pathname.split('/')[4]; // Extract ID from pathname

    // Get total likes count
    const likesCount = await prisma.streamLike.count({
      where: { streamId },
    });

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

    return NextResponse.json({
      likes: likesCount,
      isLiked: !!like,
      isSubscribed: !!subscription,
    });
  } catch (error) {
    console.error('Stream interactions GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 