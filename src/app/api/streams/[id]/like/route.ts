import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const streamId = request.nextUrl.pathname.split('/')[4];

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

    // Get stream and check if it exists
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Check if user has already liked the stream
    const existingLike = await prisma.streamLike.findUnique({
      where: {
        streamId_userId: {
          streamId,
          userId: user.id,
        },
      },
    });

    let isLiked: boolean;
    
    if (existingLike) {
      // Unlike the stream
      await prisma.streamLike.delete({
        where: {
          streamId_userId: {
            streamId,
            userId: user.id,
          },
        },
      });
      isLiked = false;
    } else {
      // Like the stream
      await prisma.streamLike.create({
        data: {
          streamId,
          userId: user.id,
        },
      });
      isLiked = true;
    }

    // Get updated like count
    const likes = await prisma.streamLike.count({
      where: { streamId },
    });

    return NextResponse.json({
      likes,
      isLiked,
    });
  } catch (error) {
    console.error('Stream like POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 