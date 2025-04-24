import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/supabase-auth';

// This is a stub route file created for development builds
// The original file has been temporarily backed up

// GET /api/collection - Fetch the user's spirit collection
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[api/collection] Fetching collection for user: ${user.id}`);

    // Fetch spirits associated with the user
    // Assuming a many-to-many relation or similar structure 
    // Adjust based on your actual schema (e.g., through tastings, favorites, etc.)
    // This example assumes a direct link or through a join table like `UserSpiritCollection`
    
    // EXAMPLE 1: Direct relation on Spirit (if spirit has userId)
    // const spirits = await prisma.spirit.findMany({
    //   where: { userId: user.id },
    //   orderBy: { name: 'asc' },
    // });

    // EXAMPLE 2: Through a join table (e.g., UserReviewedSpirit, UserFavoritedSpirit)
    // Let's assume we want spirits the user has reviewed
    const reviews = await prisma.review.findMany({
      where: { userId: user.id },
      select: {
        spirit: true // Select the related spirit
      },
      distinct: ['spiritId'] // Only get unique spirits
    });

    // Extract the spirit objects from the reviews
    const spirits = reviews.map(review => review.spirit).filter(spirit => spirit !== null);

    console.log(`[api/collection] Found ${spirits.length} spirits for user ${user.id}`);

    return NextResponse.json({ spirits });

  } catch (error) {
    console.error('[api/collection] Error fetching collection:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// POST /api/collection - Add a spirit to the user's collection (Example)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { spiritId } = body;

    if (!spiritId) {
      return NextResponse.json({ error: 'Missing spiritId in request body' }, { status: 400 });
    }

    console.log(`[api/collection] Adding spirit ${spiritId} to collection for user: ${user.id}`);

    // Logic to add spirit to collection depends on schema
    // EXAMPLE: Add a favorite record
    // const favorite = await prisma.favorite.create({
    //   data: {
    //     userId: user.id,
    //     spiritId: spiritId,
    //   }
    // });

    // Replace with your actual logic
    console.warn('[api/collection] POST endpoint needs implementation based on schema.')

    // Return a success response (or the created record)
    return NextResponse.json({ success: true, message: `Spirit ${spiritId} interaction recorded (Implementation needed)` });

  } catch (error) {
    console.error('[api/collection] Error in POST request:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
