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
    
    const user = await getCurrentUser();

    if (!user?.email) {
      console.log('[API] Unauthorized: No authenticated user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`[API] User authenticated: ${user.email}`);

    // Create and await the Supabase client
    console.log('[API] Creating Supabase client...');
    const supabase = await createServerSupabaseClient();
    console.log('[API] Supabase client created successfully');

    // Use Supabase query
    console.log(`[API] Querying database for spirit with ID: ${spiritId}`);
    const { data: spirit, error } = await supabase
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

    if (error) {
      console.error('[API] Supabase query error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error.message, code: error.code },
        { status: 500 }
      );
    }

    if (!spirit) {
      console.log(`[API] Spirit with ID ${spiritId} not found`);
      return NextResponse.json(
        { error: 'Spirit not found' },
        { status: 404 }
      );
    }

    console.log(`[API] Successfully retrieved spirit: ${spirit.name}`);

    // Check if the current user is the owner
    const isOwner = spirit.owner?.email === user.email;
    console.log(`[API] User is owner: ${isOwner}`);

    // Automatically fetch web data for the spirit
    let webData = null;
    let webError = undefined;
    
    try {
      console.log('[API] Fetching additional web data...');
      const searchQuery = `${spirit.brand} ${spirit.name} ${spirit.type}`;
      webData = await fetchWebData(searchQuery);
      console.log('[API] Web data fetched successfully');
    } catch (error) {
      console.error('[API] Error fetching web data:', error);
      webError = 'Failed to load additional information';
    }

    // Create the response with proper headers to fix CSP issues
    const response = NextResponse.json({ 
      spirit,
      isOwner,
      webData,
      webError
    });

    // Add necessary headers to handle CSP for images
    response.headers.set('Content-Security-Policy', 
      "default-src 'self'; img-src 'self' data: https: http:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://*.supabase.co https://*;"
    );
    
    // Ensure no caching to prevent stale data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('[API] Error fetching spirit:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
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
      }
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