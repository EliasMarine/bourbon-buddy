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
    const { reason } = await request.json();

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

    // Check if stream exists
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Prevent self-reporting
    if (user.id === stream.hostId) {
      return NextResponse.json(
        { error: 'Cannot report your own stream' },
        { status: 400 }
      );
    }

    // Check if user has already reported this stream
    const existingReport = await prisma.streamReport.findFirst({
      where: {
        streamId,
        userId: user.id,
        status: 'pending',
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this stream' },
        { status: 400 }
      );
    }

    // Create report
    await prisma.streamReport.create({
      data: {
        streamId,
        userId: user.id,
        reason,
        status: 'pending',
      },
    });

    return NextResponse.json({
      message: 'Stream reported successfully',
    });
  } catch (error) {
    console.error('Stream report POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 