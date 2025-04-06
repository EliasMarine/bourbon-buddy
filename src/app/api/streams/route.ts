import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // Use shared prisma instance
import { z } from 'zod';

const CreateStreamSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(5000).optional().nullable(),
  spiritId: z.string().optional().nullable(),
  privacy: z.enum(['public', 'private']).default('public'),
  invitedEmails: z.array(z.string().email()).optional(),
});

// GET /api/streams - Get all active streams
export async function GET() {
  try {
    // Calculate the stale threshold (1 hour ago)
    const staleThreshold = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    const streams = await prisma.stream.findMany({
      where: {
        isLive: true,
        // Only show streams that started within the last hour
        startedAt: {
          gte: staleThreshold
        }
      },
      include: {
        host: {
          select: {
            name: true,
            image: true,
          },
        },
        spirit: {
          select: {
            name: true,
            type: true,
            brand: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    return NextResponse.json({ streams });
  } catch (error) {
    console.error('Streams GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/streams - Create a new stream
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    try {
      const validatedData = CreateStreamSchema.parse(body);
      
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Prepare data for database - handle nulls and undefined properly
      const cleanData: any = {
        title: validatedData.title,
        description: validatedData.description || null, // Convert undefined to null
        privacy: validatedData.privacy,
        hostId: user.id,
        isLive: false, // Start as not live until the host starts streaming
        startedAt: new Date(),
      };
      
      // Only add spiritId if it exists and is not empty
      if (validatedData.spiritId && validatedData.spiritId.trim() !== '') {
        cleanData.spiritId = validatedData.spiritId;
      }

      // Create the stream
      const stream = await prisma.stream.create({
        data: cleanData,
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          spirit: validatedData.spiritId ? {
            select: {
              name: true,
              type: true,
              brand: true,
            },
          } : false, // Skip including spirit if no spiritId
        },
      });

      // If the stream is private, handle invited emails here
      if (validatedData.privacy === 'private' && validatedData.invitedEmails?.length) {
        // Here you would handle sending invitations to the provided emails
        console.log('Inviting users to private stream:', validatedData.invitedEmails);
      }

      return NextResponse.json(stream);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Validation error:', validationError.errors);
        return NextResponse.json(
          { 
            error: 'Validation error',
            details: validationError.errors 
          },
          { status: 400 }
        );
      }
      throw validationError; // Re-throw if it's not a validation error
    }
  } catch (error) {
    console.error('Stream POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Constants for stream cleanup
const CLEANUP_PERIODS = {
  STALE_LIVE: 1 * 60 * 60 * 1000,     // 1 hour for live streams that weren't properly ended
  INACTIVE: 1 * 60 * 60 * 1000,       // 1 hour for inactive streams
  COMPLETED: 1 * 60 * 60 * 1000       // 1 hour for completed streams
};

// PATCH /api/streams - Clean up old streams
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = Date.now();
    const threshold = new Date(now - CLEANUP_PERIODS.INACTIVE);

    // Delete all streams (live or not) that are older than 1 hour
    const deletedStreams = await prisma.stream.deleteMany({
      where: {
        startedAt: {
          lt: threshold
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      message: `Cleaned up ${deletedStreams.count} old streams`,
      deletedCount: deletedStreams.count
    });
  } catch (error) {
    console.error('Streams PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 