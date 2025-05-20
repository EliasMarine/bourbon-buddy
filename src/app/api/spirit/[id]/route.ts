import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/spirit/[id] - Get a specific spirit
export async function GET(request: NextRequest) {
  try {
    // Extract the ID from the URL
    const spiritId = request.nextUrl.pathname.split('/').pop();
    
    // Validate that we have a valid spirit ID
    if (!spiritId) {
      console.error('Missing spirit ID in request path');
      return NextResponse.json(
        { error: 'Bad Request', details: 'Missing spirit ID' },
        { status: 400 }
      );
    }

    console.log(`[API] Fetching details for spirit ID: ${spiritId}`);
    
    let user;
    try {
      user = await getCurrentUser();
    } catch (authError) {
      console.error('[API] Error getting current user:', authError);
      return NextResponse.json(
        { error: 'Authentication error', details: 'Failed to verify user authentication' },
        { status: 401 }
      );
    }

    if (!user?.email) {
      console.log('[API] Unauthorized: No authenticated user found');
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Login required to view spirit details' },
        { status: 401 }
      );
    }

    console.log(`[API] User authenticated: ${user.email}`);

    // Create and await the Supabase client
    let supabase;
    try {
      console.log('[API] Creating Supabase client...');
      supabase = await createServerSupabaseClient();
      console.log('[API] Supabase client created successfully');
    } catch (supabaseError) {
      console.error('[API] Failed to create Supabase client:', supabaseError);
      return NextResponse.json(
        { error: 'Database connection error', details: 'Failed to connect to database' },
        { status: 500 }
      );
    }

    // Use Supabase query with more detailed error handling
    console.log(`[API] Querying database for spirit with ID: ${spiritId}`);
    let spiritData, queryError;
    try {
      const { data, error } = await supabase
        .from('Spirit')
        .select(`
          *,
          owner:User (
            name,
            email
          )
        `)
        .eq('id', spiritId)
        .single();
      
      spiritData = data;
      queryError = error;
    } catch (queryExecError) {
      console.error('[API] Exception during Supabase query execution:', queryExecError);
      return NextResponse.json(
        { error: 'Database query failed', details: 'Failed to execute database query' },
        { status: 500 }
      );
    }

    if (queryError) {
      console.error('[API] Supabase query error:', queryError);
      if (queryError.code === 'PGRST116') {
        // No rows returned by supabase single() function
        return NextResponse.json(
          { error: 'Spirit not found', details: `Spirit with ID ${spiritId} does not exist` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Database error', details: queryError.message, code: queryError.code },
        { status: 500 }
      );
    }

    if (!spiritData) {
      console.log(`[API] Spirit with ID ${spiritId} not found`);
      return NextResponse.json(
        { error: 'Spirit not found', details: `Spirit with ID ${spiritId} does not exist` },
        { status: 404 }
      );
    }

    console.log(`[API] Successfully retrieved spirit: ${spiritData.name}`);

    // Check if the current user is the owner
    const isOwner = spiritData.owner?.email === user.email;
    console.log(`[API] User is owner: ${isOwner}`);

    // Skip web data fetching if it's causing issues
    let webData = null;
    let webError = undefined;
    
    try {
      console.log('[API] Fetching additional web data...');
      const searchQuery = `${spiritData.brand} ${spiritData.name} ${spiritData.type}`;
      webData = await fetchWebData(searchQuery);
      console.log('[API] Web data fetched successfully');
    } catch (error) {
      console.error('[API] Error fetching web data:', error);
      webError = 'Failed to load additional information';
      // Continue despite web data error - this is non-critical
    }

    // Create the response with proper headers
    try {
      const response = NextResponse.json({ 
        spirit: spiritData,
        isOwner,
        webData,
        webError
      });

      // Add necessary headers to handle CSP for images
      response.headers.set('Content-Security-Policy', 
        "default-src 'self'; img-src 'self' data: https: http:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://*.supabase.co https://serpapi.com https://*;"
      );
      
      // Ensure no caching to prevent stale data
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');

      return response;
    } catch (responseError) {
      console.error('[API] Error creating response:', responseError);
      return NextResponse.json(
        { error: 'Server error', details: 'Failed to create response' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Unhandled error in spirit API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
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
      
    console.log(`[API] Sending web search request to: ${baseUrl}/api/web-search for query: ${searchQuery}`);
    const response = await fetch(`${baseUrl}/api/web-search?query=${encodeURIComponent(searchQuery)}`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      // Add a reasonable timeout
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (!response.ok) {
      console.error(`[API] Web search request failed with status: ${response.status} ${response.statusText}`);
      throw new Error(`Web search failed: ${response.status} ${response.statusText}`);
    }
    
    console.log('[API] Web search request successful');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[API] Web data fetch error:', error);
    throw error;
  }
} 