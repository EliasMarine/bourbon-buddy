import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const streamId = request.nextUrl.pathname.split('/')[4]; // Extract ID from pathname

    // Get total likes count
    const likesCount = await prisma.streamLike.count({
      where: { streamId },
    });

    // If user is not logged in, return only public data
    if (!session?.user?.email) {
      return NextResponse.json({
        likes: likesCount,
        isLiked: false,
        isSubscribed: false,
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
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
          userId: user.id,
        },
      },
    });

    // Check if user is subscribed to the host
    const subscription = await prisma.streamSubscription.findUnique({
      where: {
        hostId_userId: {
          hostId: stream.hostId,
          userId: user.id,
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