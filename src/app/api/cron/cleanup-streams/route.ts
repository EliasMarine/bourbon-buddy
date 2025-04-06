import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Constants for stream cleanup
const CLEANUP_PERIODS = {
  INACTIVE: 1 * 60 * 60 * 1000  // 1 hour for any stream
};

// This endpoint should be called by a cron job
export async function POST(request: Request) {
  try {
    // Verify the request is from an authorized source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = Date.now();
    const threshold = new Date(now - CLEANUP_PERIODS.INACTIVE);

    // Delete all streams older than 1 hour
    const deletedStreams = await prisma.stream.deleteMany({
      where: {
        startedAt: {
          lt: threshold
        }
      }
    });

    // Log the cleanup results
    console.log(`Automated cleanup: ${deletedStreams.count} streams deleted`);

    return NextResponse.json({ 
      success: true,
      message: `Automated cleanup complete: ${deletedStreams.count} streams deleted`,
      deletedCount: deletedStreams.count
    });
  } catch (error) {
    console.error('Automated stream cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 