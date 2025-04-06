import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/spirit/[id] - Get a specific spirit
export async function GET(request: NextRequest) {
  try {
    // Extract the ID from the URL
    const spiritId = request.nextUrl.pathname.split('/').pop();
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const spirit = await prisma.spirit.findUnique({
      where: { id: spiritId },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
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

    // Automatically fetch web data for the spirit
    let webData = null;
    let webError = undefined;
    
    try {
      const searchQuery = `${spirit.brand} ${spirit.name} ${spirit.type}`;
      webData = await fetchWebData(searchQuery);
    } catch (error) {
      console.error('Error fetching web data:', error);
      webError = 'Failed to load additional information';
    }

    return NextResponse.json({ 
      spirit,
      isOwner,
      webData,
      webError
    });
  } catch (error) {
    console.error('Error fetching spirit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to fetch data from the web
async function fetchWebData(searchQuery: string) {
  try {
    // Use the web search API to get relevant information
    // Get host from request for local development
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';
      
    const response = await fetch(`${baseUrl}/api/web-search?query=${encodeURIComponent(searchQuery)}`);
    
    if (!response.ok) {
      throw new Error('Web search failed');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Web data fetch error:', error);
    throw error;
  }
} 