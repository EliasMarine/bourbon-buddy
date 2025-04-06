import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { hostId } = await request.json();

    if (!hostId) {
      return NextResponse.json(
        { error: 'Host ID is required' },
        { status: 400 }
      );
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

    // Check if host exists
    const host = await prisma.user.findUnique({
      where: { id: hostId },
    });

    if (!host) {
      return NextResponse.json(
        { error: 'Host not found' },
        { status: 404 }
      );
    }

    // Prevent self-subscription
    if (user.id === hostId) {
      return NextResponse.json(
        { error: 'Cannot subscribe to yourself' },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const existingSubscription = await prisma.streamSubscription.findUnique({
      where: {
        hostId_userId: {
          hostId,
          userId: user.id,
        },
      },
    });

    if (existingSubscription) {
      // Unsubscribe
      await prisma.streamSubscription.delete({
        where: {
          hostId_userId: {
            hostId,
            userId: user.id,
          },
        },
      });

      return NextResponse.json({
        isSubscribed: false,
        message: 'Unsubscribed successfully',
      });
    }

    // Subscribe
    await prisma.streamSubscription.create({
      data: {
        hostId,
        userId: user.id,
      },
    });

    return NextResponse.json({
      isSubscribed: true,
      message: 'Subscribed successfully',
    });
  } catch (error) {
    console.error('Stream subscription POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 