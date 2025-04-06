import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/spirits/[id] - Get a specific spirit details
export async function GET(request: NextRequest) {
  try {
    const spiritId = request.nextUrl.pathname.split('/').pop();
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the spirit with owner details
    const spirit = await prisma.spirit.findUnique({
      where: { id: spiritId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
        // Include other related data if needed (notes, reviews, etc.)
      },
    });

    if (!spirit) {
      return NextResponse.json(
        { error: 'Spirit not found' },
        { status: 404 }
      );
    }

    // Check if the current user is the owner
    const isOwner = spirit.owner.email === session.user.email;

    return NextResponse.json({ 
      spirit,
      isOwner
    });
  } catch (error) {
    console.error('Error fetching spirit details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 