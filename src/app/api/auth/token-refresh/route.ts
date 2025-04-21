import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors';

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req);
}

/**
 * Token refresh endpoint for Supabase authentication
 * This route proxies refresh token requests to avoid CORS issues
 */
export async function POST(req: NextRequest) {
  const debugId = Math.random().toString(36).substring(2, 8); // Add debug ID
  try {
    console.log(`[${debugId}] Token refresh proxy endpoint called`);
    
    let body;
    try {
      body = await req.json();
      console.log(`[${debugId}] Request body parsed successfully`);
    } catch (parseError) {
      console.error(`[${debugId}] Error parsing request body:`, parseError);
      const response = NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      setCorsHeaders(req, response);
      return response;
    }

    const { refresh_token } = body;
    
    if (!refresh_token) {
      console.error(`[${debugId}] Invalid refresh token request: missing refresh_token`);
      const response = NextResponse.json({ error: 'Refresh token not found' }, { status: 400 });
      setCorsHeaders(req, response);
      return response;
    }
    
    let supabase;
    try {
      console.log(`[${debugId}] Creating server-side Supabase client`);
      supabase = createSupabaseServerClient();
      console.log(`[${debugId}] Supabase client created`);
    } catch (clientError) {
      console.error(`[${debugId}] Error creating Supabase client:`, clientError);
      const response = NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      setCorsHeaders(req, response);
      return response;
    }
    
    console.log(`[${debugId}] Attempting session refresh with token starting: ${refresh_token.substring(0, 5)}...`);
    // Handle refresh on the server side to avoid CORS and cookie issues
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });
    
    if (error) {
      console.error(`[${debugId}] Proxy token refresh failed:`, error);
      const response = NextResponse.json({ error: error.message }, { status: error.status || 401 }); // Use error status if available
      setCorsHeaders(req, response);
      return response;
    }
    
    if (!data || !data.session) { // Check data as well
      console.error(`[${debugId}] Token refresh error: No session returned in data object`);
      const response = NextResponse.json({ error: 'Session refresh failed - no session data' }, { status: 500 });
      setCorsHeaders(req, response);
      return response;
    }
    
    console.log(`[${debugId}] Token refresh successful, returning new session data`);
    
    // Return the refreshed session data
    const response = NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in || 3600, // Use actual expiry if available
      token_type: data.session.token_type || 'bearer',
      user: data.user
    });
    
    // Set proper CORS headers
    setCorsHeaders(req, response);
    
    return response;
  } catch (error) {
    console.error(`[${debugId}] Critical error in token refresh endpoint:`, error);
    const response = NextResponse.json({ error: 'An unexpected error occurred during token refresh' }, { status: 500 });
    setCorsHeaders(req, response);
    return response;
  }
} 