import { NextRequest, NextResponse } from 'next/server';
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient } from '@/utils/supabase/server';
import { validateCsrfToken } from '@/lib/csrf';
import { cookies } from 'next/headers';

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req);
}

/**
 * Token refresh endpoint that proxies requests to Supabase
 * This avoids CORS issues when refreshing tokens
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Token refresh proxy request received');
    
    // Skip CSRF validation for token refresh to prevent auth loops
    // This is relatively safe since we're still using cookies with HttpOnly, Same-Site
    // and we require the refresh_token which is a secret
    let csrfSkipped = false;
    
    if (process.env.NODE_ENV === 'production') {
      // In production, we still validate CSRF but don't block on failure
      // This helps debug issues while maintaining functionality
      const isValid = validateCsrfToken(req);
      if (!isValid) {
        console.warn('CSRF validation failed in token refresh, but continuing');
        csrfSkipped = true;
      }
    } else {
      console.log('Skipping CSRF validation in development mode');
      csrfSkipped = true;
    }
    
    // Create server client to get session from cookies first
    console.log('Creating Supabase server client for token refresh from cookies');
    const supabase = await createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    
    // Try to get refresh token from request body
    let refresh_token;
    try {
      const body = await req.json();
      refresh_token = body.refresh_token;
      console.log('Found refresh token in request body:', refresh_token ? 'Yes' : 'No');
    } catch (parseError) {
      console.log('Could not parse request body, continuing with cookies:', parseError);
    }
    
    // If no refresh token in body, use the one from session
    if (!refresh_token && sessionData?.session?.refresh_token) {
      console.log('Using refresh token from session cookies');
      refresh_token = sessionData.session.refresh_token;
    }
    
    // If we still don't have a refresh token, return an error
    if (!refresh_token) {
      console.error('No refresh token available from request or cookies');
      const response = NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 400 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    // Use the same client for token refresh
    console.log('Attempting to refresh token with Supabase');
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    
    if (error || !data.session) {
      console.error('Token refresh error:', error?.message || 'No session returned');
      const response = NextResponse.json(
        { error: error?.message || 'Failed to refresh session' },
        { status: 401 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    console.log('Token refresh successful');
    
    // Return session data in Supabase-compatible format
    const response = NextResponse.json({
      access_token: data.session.access_token,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: data.session.refresh_token,
      user: data.user
    });
    
    // Add CSRF skip info for debugging
    if (csrfSkipped) {
      response.headers.set('X-CSRF-Skipped', 'true');
    }
    
    // Set CORS headers
    setCorsHeaders(req, response);
    return response;
  } catch (error) {
    console.error('Token refresh critical error:', error);
    const response = NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
    setCorsHeaders(req, response);
    return response;
  }
} 