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
  try {
    console.log('Token refresh proxy endpoint called');
    
    // Parse the request body
    const body = await req.json();
    const { refresh_token } = body;
    
    if (!refresh_token) {
      console.error('Invalid refresh token request: missing refresh_token');
      
      const response = NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 400 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    // Create a server-side Supabase client
    const supabase = createSupabaseServerClient();
    
    // Handle refresh on the server side to avoid CORS and cookie issues
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });
    
    if (error) {
      console.error('Proxy token refresh failed:', error);
      
      const response = NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    if (!data.session) {
      console.error('Token refresh error: No session returned');
      
      const response = NextResponse.json(
        { error: 'Session refresh failed - no session' },
        { status: 500 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    console.log('Token refresh successful, returning new session data');
    
    // Return the refreshed session data
    const response = NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: 3600, // Default expiry time in seconds
      token_type: 'bearer',
      user: data.user
    });
    
    // Set proper CORS headers
    setCorsHeaders(req, response);
    
    return response;
  } catch (error) {
    console.error('Critical error in token refresh endpoint:', error);
    
    // Create error response with CORS headers
    const response = NextResponse.json(
      { error: 'An unexpected error occurred during token refresh' },
      { status: 500 }
    );
    
    // Ensure CORS headers are set even in error case
    setCorsHeaders(req, response);
    
    return response;
  }
} 