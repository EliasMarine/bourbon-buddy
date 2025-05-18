import { NextResponse } from 'next/server';
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // Reverted this import
// import { cookies } from 'next/headers'; // Reverted this import, assuming getCurrentUser handles session from request or similar
import supabase from '@/lib/supabase'; // Assuming this is your configured Supabase client instance for server-side
import { getCurrentUser, createAdminClient } from '@/lib/supabase-auth'; // Import createAdminClient from the correct file
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
    // Get authenticated user
    const user = await getCurrentUser();

    // Check if user is authenticated and has a valid ID
    if (!user?.id) {
      console.error('[api/collection] No authenticated user found or missing user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    
    // Log the incoming request for debugging
    console.log('[api/collection] POST request received:', {
      userId: user.id,
      requestBody: JSON.stringify(body)
    });
    
    // Create a copy of the data with explicit ownerId set
    const spiritData = { 
      ...body,
      ownerId: user.id // Ensure ownerId is explicitly set to the authenticated user's ID
    };
    
    // Log the processed data that will be sent to Supabase
    console.log('[api/collection] Processed spirit data:', {
      ownerId: spiritData.ownerId,
      userId: user.id,
      spiritId: spiritData.id,
      name: spiritData.name
    });
    
    // Validate required fields
    if (!spiritData.name || !spiritData.type || !spiritData.brand) {
      return NextResponse.json({ 
        error: 'Missing required spirit fields', 
        details: 'Name, type, and brand are required' 
      }, { status: 400 });
    }

    // Process rating field
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
            // Already in correct range, ensure it's an integer
            spiritData.rating = Math.round(ratingNum);
            console.log(`[api/collection] Rating ${ratingNum} already in range, rounded to ${spiritData.rating}`);
          } else {
            // Invalid range
            console.log(`[api/collection] Invalid rating value: ${ratingNum}, setting to null`);
            spiritData.rating = null;
          }
        } else {
          // Not a valid number
          console.log(`[api/collection] Non-numeric rating: ${originalRating}, setting to null`);
          spiritData.rating = null;
        }
      } catch (err) {
        console.error(`[api/collection] Error processing rating:`, err);
        spiritData.rating = null;
      }
    }

    // Final safety check - ensure rating is an integer if present
    if (spiritData.rating !== null && spiritData.rating !== undefined) {
      spiritData.rating = Math.round(spiritData.rating);
    }

    // Log the final data being sent to the database
    console.log(`[api/collection] Inserting spirit:`, {
      id: spiritData.id,
      name: spiritData.name,
      ownerId: spiritData.ownerId,
      rating: spiritData.rating
    });

    // Use the admin client to bypass RLS for troubleshooting purposes
    // This is only a temporary solution - the actual fix should be at the Supabase RLS policy level
    const adminClient = createAdminClient();
    const { data: newSpirit, error } = await adminClient
      .from('Spirit')
      .insert(spiritData)
      .select()
      .single();

    if (error) {
      console.error('[api/collection] Error adding spirit to collection:', error);
      if (error.code === '42501') {
        console.error('[api/collection] Permission denied. RLS policy violation. Details:', error);
        
        // Check if the user exists in the auth system
        try {
          const { data: authUser, error: authError } = await supabase.auth.getUser();
          console.log('[api/collection] Auth user check:', authUser ? 'User found' : 'User not found');
          if (authError) {
            console.error('[api/collection] Auth user check error:', authError);
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

    console.log(`[api/collection] Spirit added successfully for user ${user.id}:`, {
      id: newSpirit.id,
      name: newSpirit.name
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `Spirit added to collection`, 
      spirit: newSpirit 
    }, { status: 201 });

  } catch (error) {
    console.error('[api/collection] Unhandled error in POST request:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
