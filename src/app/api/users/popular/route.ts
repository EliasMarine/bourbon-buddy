import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/users/popular - Get users with the most spirits in their collection
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find users with their spirits count
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
      },
      where: {
        // Filter out current user and ensure users have spirits
        NOT: {
          email: session.user.email
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 8
    });

    // For each user, count their spirits separately
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const count = await prisma.spirit.count({
          where: {
            ownerId: user.id
          }
        });

        return {
          ...user,
          spiritsCount: count
        };
      })
    );

    // Sort by spirits count descending
    const sortedUsers = usersWithCounts
      .filter(user => user.spiritsCount > 0)
      .sort((a, b) => b.spiritsCount - a.spiritsCount)
      .slice(0, 12);

    return NextResponse.json({ users: sortedUsers });
  } catch (error) {
    console.error('Error fetching popular users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 