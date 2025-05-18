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
    const spiritData = { ...body, ownerId: user.id };
    
    if (!spiritData.name || !spiritData.type || !spiritData.brand) {
        return NextResponse.json({ error: 'Missing required spirit fields (name, type, brand)' }, { status: 400 });
    }

    console.log(`[api/collection] Attempting to add spirit for user: ${user.id}`, spiritData);

    const { data: newSpirit, error } = await supabase // Using the imported supabase client
      .from('Spirit')
      .insert(spiritData)
      .select()
      .single();

    if (error) {
      console.error('[api/collection] Error adding spirit to collection:', error);
      if (error.code === '42501') {
          console.error('[api/collection] Permission denied. Check RLS policies for Spirit table INSERT for authenticated users.');
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
