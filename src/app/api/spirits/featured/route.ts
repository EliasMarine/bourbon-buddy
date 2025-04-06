import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/spirits/featured - Get featured spirits from different users
export async function GET(
  request: Request,
) {
  try {
    // Parse request URL to get query parameters
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const subcategory = url.searchParams.get('subcategory');
    const limit = parseInt(url.searchParams.get('limit') || '24');
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build query conditions
    const whereConditions: any = {
      // Don't include current user's spirits
      owner: {
        NOT: {
          email: session.user.email
        }
      },
      // Either has a rating or has an image
      OR: [
        { rating: { gte: 3 } },
        { NOT: { imageUrl: null } }
      ]
    };

    // Add category and subcategory filters if provided
    if (category) {
      whereConditions.category = category;
    }
    
    if (subcategory) {
      whereConditions.type = subcategory;
    }

    // Get spirits with high ratings or recently added
    const spirits = await prisma.spirit.findMany({
      select: {
        id: true,
        name: true,
        brand: true,
        type: true,
        category: true,
        imageUrl: true,
        rating: true,
        ownerId: true,
        owner: {
          select: {
            name: true,
            image: true,
          }
        },
        createdAt: true,
      },
      where: whereConditions,
      orderBy: [
        { rating: 'desc' },
        { createdAt: 'desc' }
      ],
      take: Math.min(limit, 50) // Limit maximum to 50 for performance
    });

    // Format the response
    const formattedSpirits = spirits.map(spirit => ({
      id: spirit.id,
      name: spirit.name,
      brand: spirit.brand,
      type: spirit.type,
      category: spirit.category || 'whiskey', // Default to whiskey for backward compatibility
      imageUrl: spirit.imageUrl,
      rating: spirit.rating,
      ownerId: spirit.ownerId,
      ownerName: spirit.owner.name || 'Anonymous',
      ownerAvatar: spirit.owner.image
    }));

    return NextResponse.json({ spirits: formattedSpirits });
  } catch (error) {
    console.error('Error fetching featured spirits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 