import { NextResponse, NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { PrismaClient } from '@prisma/client';
// Removed authOptions import - not needed with Supabase Auth;
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const TipSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  message: z.string().max(500).optional(),
});

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
    const body = await request.json();

    // Validate request body
    const validatedData = TipSchema.parse(body);

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

    // Prevent self-tipping
    if (dbUser.id === stream.hostId) {
      return NextResponse.json(
        { error: 'Cannot tip your own stream' },
        { status: 400 }
      );
    }

    // Create tip
    const tip = await prisma.streamTip.create({
      data: {
        amount: validatedData.amount,
        message: validatedData.message,
        streamId,
        senderId: dbUser.id,
        hostId: stream.hostId,
      },
    });

    return NextResponse.json({
      message: 'Tip sent successfully',
      tip,
    });
  } catch (error) {
    console.error('Stream tip POST error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 