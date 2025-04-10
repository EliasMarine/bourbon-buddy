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
    const { reason } = await request.json();

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
    if (dbUser.id === stream.hostId) {
      return NextResponse.json(
        { error: 'Cannot report your own stream' },
        { status: 400 }
      );
    }

    // Check if user has already reported this stream
    const existingReport = await prisma.streamReport.findFirst({
      where: {
        streamId,
        userId: dbUser.id,
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
        userId: dbUser.id,
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