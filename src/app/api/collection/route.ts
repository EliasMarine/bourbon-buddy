import { NextResponse } from 'next/server';
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Reverted this import
// import { cookies } from 'next/headers'; // Reverted this import, assuming getCurrentUser handles session from request or similar
import supabase from '@/lib/supabase'; // Assuming this is your configured Supabase client instance for server-side
import { getCurrentUser } from '@/lib/supabase-auth'; // Assuming this correctly gets user in Route Handlers
import { Spirit } from '@/types';

// This is a stub route file created for development builds
// The original file has been temporarily backed up

// GET /api/collection - Fetch the user's spirit collection with server-side filtering, sorting, and pagination
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const user = await getCurrentUser(); // Using your existing function
    if (!user?.id) { // Adjusted to check user.id as per your original code
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[api/collection] Fetching collection for user: ${user.id} with params: ${searchParams.toString()}`);

    // Get filter, sort, pagination params from URLSearchParams
    const name = searchParams.get('name');
    const type = searchParams.get('type');
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    const country = searchParams.get('country');
    const region = searchParams.get('region');
    const proofMin = searchParams.get('proofMin');
    const proofMax = searchParams.get('proofMax');
    
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '9', 10);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit - 1;

    let query = supabase // Using the imported supabase client
      .from('Spirit')
      .select('*_count:count', { count: 'exact' })
      .eq('ownerId', user.id);

    // Apply filters conditionally
    if (name) query = query.ilike('name', `%${name}%`);
    if (type) query = query.eq('type', type);
    if (priceMin) query = query.gte('price', parseFloat(priceMin));
    if (priceMax) query = query.lte('price', parseFloat(priceMax));
    if (country) query = query.eq('country', country);
    if (region) query = query.eq('region', region);
    if (proofMin) query = query.gte('proof', parseFloat(proofMin));
    if (proofMax) query = query.lte('proof', parseFloat(proofMax));

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range(startIndex, endIndex);

    const { data: spirits, error, count } = await query;

    if (error) {
      console.error('[api/collection] Error fetching spirits:', error);
      return NextResponse.json({ error: 'Error fetching spirits', details: error.message }, { status: 500 });
    }

    console.log(`[api/collection] Found ${spirits?.length || 0} spirits for page ${page}, total matching: ${count}`);

    return NextResponse.json({
      spirits: spirits || [],
      totalItems: count || 0,
      totalPages: count ? Math.ceil(count / limit) : 0,
      currentPage: page,
    });

  } catch (error) {
    console.error('[api/collection] Error in GET request:', error);
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
// This POST handler needs to be updated to insert into the 'Spirit' table with ownerId,
// not the 'Favorite' table, if it's meant for adding to the main collection.
// For now, leaving it as is, but this is a point of potential mismatch with client expectations.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(); // Using your existing function

    if (!user?.id) { // Adjusted to check user.id
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Log the incoming request body for debugging
    console.log('[api/collection] Received POST request body:', JSON.stringify(body));
    
    // Ensure ownerId is set and matches the authenticated user
    const spiritData = { 
      ...body, 
      ownerId: user.id 
    };
    
    console.log('[api/collection] User ID from auth:', user.id);
    console.log('[api/collection] Owner ID in spirit data:', spiritData.ownerId);
    
    if (!spiritData.name || !spiritData.type || !spiritData.brand) {
        return NextResponse.json({ error: 'Missing required spirit fields (name, type, brand)' }, { status: 400 });
    }

    // Handle rating - first check if it exists
    if (spiritData.rating !== undefined && spiritData.rating !== null) {
      const originalRating = spiritData.rating;
      
      try {
        // Ensure it's a number
        const ratingNum = typeof originalRating === 'number' 
          ? originalRating 
          : parseFloat(String(originalRating));
        
        if (!isNaN(ratingNum)) {
          if (ratingNum >= 1 && ratingNum <= 10) {
            // Scale up from 1-10 to 10-100 range (database expects integer)
            const scaledRating = Math.round(ratingNum * 10);
            console.log(`[api/collection] Converting rating from ${ratingNum} to ${scaledRating}`);
            spiritData.rating = scaledRating;
          } else if (ratingNum > 10 && ratingNum <= 100) {
            // Already in correct range, just ensure it's an integer
            spiritData.rating = Math.round(ratingNum);
            console.log(`[api/collection] Rating ${ratingNum} already in appropriate range, rounded to ${spiritData.rating}`);
          } else {
            // Invalid range
            console.log(`[api/collection] Invalid rating value: ${ratingNum}, setting to null`);
            spiritData.rating = null;
          }
        } else {
          // Not a valid number
          console.log(`[api/collection] Non-numeric rating value: ${originalRating}, setting to null`);
          spiritData.rating = null;
        }
      } catch (err) {
        console.error(`[api/collection] Error processing rating:`, err);
        spiritData.rating = null;
      }
    }

    // Final safety check - ensure rating is an integer (critical for database compatibility)
    if (spiritData.rating !== null && spiritData.rating !== undefined) {
      spiritData.rating = Math.round(spiritData.rating);
    }

    console.log(`[api/collection] Final spirit data being sent to database:`, JSON.stringify(spiritData));

    const { data: newSpirit, error } = await supabase // Using the imported supabase client
      .from('Spirit')
      .insert(spiritData)
      .select()
      .single();

    if (error) {
      console.error('[api/collection] Error adding spirit to collection:', error);
      if (error.code === '42501') {
          console.error('[api/collection] Permission denied. RLS policy violation. Details:', error);
          console.error('[api/collection] This is likely an issue with the Supabase RLS policies for the Spirit table');
          console.error('[api/collection] Ensure the RLS policy allows insert for authenticated users with matching ownerId');
          
          // Check if the user exists in the auth system
          try {
            const { data: authUser, error: authError } = await supabase.auth.getUser();
            if (authError) {
              console.error('[api/collection] Error checking auth user:', authError);
            } else {
              console.log('[api/collection] Auth user check result:', authUser);
            }
          } catch (authCheckError) {
            console.error('[api/collection] Exception during auth check:', authCheckError);
          }
      }
      return NextResponse.json(
        { error: 'Error adding spirit to collection', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    console.log(`[api/collection] Spirit added successfully for user ${user.id}:`, newSpirit);
    return NextResponse.json({ 
      success: true, 
      message: `Spirit added to collection`, 
      spirit: newSpirit 
    }, { status: 201 });

  } catch (error) {
    console.error('[api/collection] Error in POST request:', error);
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
    }
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
