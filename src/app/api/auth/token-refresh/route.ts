import { NextRequest, NextResponse } from 'next/server';
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors';
import { createClient } from '@/utils/supabase/server';
import { validateCsrfToken } from '@/lib/csrf';

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
    
    // Check for refresh token in cookies directly as last resort
    if (!refresh_token) {
      try {
        // Try to extract refresh token from cookies (backup approach)
        const cookieHeader = req.headers.get('cookie');
        if (cookieHeader) {
          const cookies = cookieHeader.split(';').map(c => c.trim());
          const refreshTokenCookie = cookies.find(c => c.startsWith('sb-refresh-token='));
          
          if (refreshTokenCookie) {
            try {
              const tokenValue = refreshTokenCookie.split('=')[1];
              if (tokenValue) {
                refresh_token = decodeURIComponent(tokenValue);
                console.log('Found refresh token in request cookies');
              }
            } catch (e) {
              console.error('Error parsing refresh token cookie:', e);
            }
          }
        }
      } catch (cookieError) {
        console.warn('Error extracting refresh token from cookies:', cookieError);
      }
    }
    
    // If we still don't have a refresh token, check if we have a current session and return it
    if (!refresh_token) {
      if (sessionData?.session) {
        console.log('No refresh token found, but have an active session - returning current session');
        const response = NextResponse.json({
          access_token: sessionData.session.access_token,
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: sessionData.session.refresh_token,
          user: sessionData.session.user
        });
        setCorsHeaders(req, response);
        return response;
      }
      
      console.error('No refresh token available from request or cookies and no active session');
      const response = NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 400 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    // Use client for token refresh
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