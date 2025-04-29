import { NextResponse } from 'next/server';
import supabase, { createServerSupabaseClient } from '@/lib/supabase';
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

    // Fetch spirits associated with the user through reviews (using Supabase)
    const { data: reviews, error: reviewsError } = await supabase
      .from('Review')
      .select('spiritId')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (reviewsError) {
      console.error('[api/collection] Error fetching reviews:', reviewsError);
      return NextResponse.json(
        { error: 'Error fetching reviews', details: reviewsError.message },
        { status: 500 }
      );
    }

    // Get unique spirit IDs (fix for Set iteration issue)
    const spiritIdSet = new Set<string>();
    reviews.forEach(review => {
      if (review.spiritId) spiritIdSet.add(review.spiritId);
    });
    const uniqueSpiritIds = Array.from(spiritIdSet);

    if (uniqueSpiritIds.length === 0) {
      console.log(`[api/collection] No spirits found for user ${user.id}`);
      return NextResponse.json({ spirits: [] });
    }

    // Fetch the spirits by their IDs
    const { data: spirits, error: spiritsError } = await supabase
      .from('Spirit')
      .select('*')
      .in('id', uniqueSpiritIds);

    if (spiritsError) {
      console.error('[api/collection] Error fetching spirits:', spiritsError);
      return NextResponse.json(
        { error: 'Error fetching spirits', details: spiritsError.message },
        { status: 500 }
      );
    }

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

// POST /api/collection - Add a spirit to the user's collection
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

    // Add to user's favorites using Supabase
    const { data, error } = await supabase
      .from('Favorite')
      .insert({
        userId: user.id,
        spiritId: spiritId,
      })
      .select();

    if (error) {
      console.error('[api/collection] Error adding to collection:', error);
      return NextResponse.json(
        { error: 'Error adding to collection', details: error.message },
        { status: 500 }
      );
    }

    // Return a success response with the created record
    return NextResponse.json({ 
      success: true, 
      message: `Spirit ${spiritId} added to collection`, 
      data 
    });

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
