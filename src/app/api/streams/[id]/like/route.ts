import { NextResponse, NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { PrismaClient } from '@prisma/client';
// Removed authOptions import - not needed with Supabase Auth;
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const streamId = request.nextUrl.pathname.split('/')[4];

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
          userId: dbUser.id,
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
            userId: dbUser.id,
          },
        },
      });
      isLiked = false;
    } else {
      // Like the stream
      await prisma.streamLike.create({
        data: {
          streamId,
          userId: dbUser.id,
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