import { NextRequest, NextResponse } from 'next/server';
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors';
import { createSupabaseServerClient } from '@/lib/supabase-server';
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
    
    // Skip CSRF validation in development mode to simplify local testing
    if (process.env.NODE_ENV !== 'development') {
      // Validate CSRF token
      const isValid = validateCsrfToken(req);
      if (!isValid) {
        console.error('Invalid CSRF token for token refresh');
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    } else {
      console.log('Skipping CSRF validation in development mode');
    }
    
    // Create server client to get session from cookies first
    console.log('Creating Supabase server client for token refresh from cookies');
    const supabase = createSupabaseServerClient();
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
    
    // Last resort: check for specific cookie from request directly
    if (!refresh_token) {
      try {
        // Using the request cookies directly instead of next/headers
        const cookieHeader = req.headers.get('cookie');
        if (cookieHeader) {
          const cookies = cookieHeader.split(';');
          const refreshTokenCookie = cookies.find(cookie => 
            cookie.trim().startsWith('sb-refresh-token=')
          );
          
          if (refreshTokenCookie) {
            console.log('Found refresh token in request cookie header');
            const tokenValue = refreshTokenCookie.split('=')[1].trim();
            
            if (tokenValue) {
              try {
                // If the cookie might be URL encoded or in JSON format
                const decodedCookie = decodeURIComponent(tokenValue);
                if (decodedCookie.startsWith('{')) {
                  const parsedCookie = JSON.parse(decodedCookie);
                  refresh_token = parsedCookie.value || parsedCookie.token || parsedCookie;
                } else {
                  refresh_token = decodedCookie;
                }
              } catch (e) {
                console.log('Using cookie value directly');
                refresh_token = tokenValue;
              }
            }
          }
        }
      } catch (cookieError) {
        console.error('Error parsing cookie header:', cookieError);
      }
    }
    
    // If we still don't have a refresh token, return an error
    if (!refresh_token) {
      console.error('No refresh token available in request body, session, or cookies');
      const response = NextResponse.json(
        { error: 'Refresh token is required', details: 'Token not found in request or cookies' },
        { status: 400 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    // Log info about the refresh token (first chars only for security)
    const tokenPreview = typeof refresh_token === 'string' 
      ? refresh_token.substring(0, 5) + '...' 
      : 'Invalid token format';
    console.log(`Refreshing session with token: ${tokenPreview}`);
    
    // Refresh the session using the Supabase client
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });
    
    if (error) {
      console.error(`Supabase token refresh error:`, error.message);
      const response = NextResponse.json(
        { error: error.message },
        { status: error.status || 401 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    if (!data.session) {
      console.error('No session returned from refresh');
      const response = NextResponse.json(
        { error: 'Failed to refresh session' },
        { status: 400 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    console.log('Successfully refreshed token from Supabase');
    
    // Return the refreshed session data in the format expected by Supabase JS client
    const successResponse = NextResponse.json({
      access_token: data.session.access_token,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: data.session.refresh_token,
      user: data.user
    });
    
    setCorsHeaders(req, successResponse);
    return successResponse;
  } catch (error) {
    console.error('Token refresh error:', error);
    const response = NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
    setCorsHeaders(req, response);
    return response;
  }
} 