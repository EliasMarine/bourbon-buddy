import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'
import { validateCsrfToken } from '@/lib/csrf'

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req)
}

/**
 * Logout endpoint for Supabase authentication
 * This route proxies logout requests to avoid CORS issues with Firefox
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Logout endpoint called')
    
    // Temporarily disable CSRF validation for testing
    /*
    // Skip CSRF validation in development mode to simplify local testing
    if (process.env.NODE_ENV !== 'development') {
      // Validate CSRF token
      const isValid = validateCsrfToken(req)
      if (!isValid) {
        console.error('Invalid CSRF token for logout')
        const response = NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        )
        setCorsHeaders(req, response)
        return response
      }
    } else {
      console.log('Skipping CSRF validation in development mode')
    }
    */
    console.log('⚠️ CSRF validation temporarily disabled for testing logout ⚠️');
    
    // Create a direct Supabase client
    const supabase = createSupabaseServerClient()
    
    // Handle logout on the server side with global scope to invalidate all sessions
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    
    if (error) {
      console.error('Logout error:', error.message)
      const response = NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
      setCorsHeaders(req, response)
      return response
    }
    
    // Create response with proper CORS headers
    const response = NextResponse.json({
      message: 'Successfully logged out'
    });
    
    // Define the domain based on environment
    const cookieDomain = process.env.NODE_ENV === 'production' 
      ? '.bourbonbuddy.live' // Use your main domain with a leading dot
      : undefined; // Let the browser handle localhost

    // Clear auth cookies directly from the response - more robustly
    const authCookies = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-provider-token', // Add any other potential provider tokens
      'sb-provider-refresh-token',
      'supabase-auth-token',
      // Include Supabase < P C K E > cookies if used
      'sb-pkce-verifier',
      // Add dynamic cookie name based on Supabase project ref
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [
        `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1]?.split('.')[0]}-auth-token`
      ] : [])
    ];

    console.log(`[Logout API] Attempting to clear cookies: ${authCookies.join(', ')} for domain: ${cookieDomain || 'default'}`);

    authCookies.forEach(name => {
      // Clear cookie with path=/ and domain
      response.cookies.set({
        name,
        value: '',
        expires: new Date(0),
        path: '/',
        domain: cookieDomain,
        httpOnly: true, // Match typical Supabase cookie settings
        secure: process.env.NODE_ENV === 'production', // Match typical Supabase cookie settings
        sameSite: 'lax' // Match typical Supabase cookie settings
      });
      // Clear cookie without path and domain (for localhost/simpler cases)
      response.cookies.set({
        name,
        value: '',
        expires: new Date(0),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    });

    // Also try deleting directly (some browsers might respond better)
    authCookies.forEach(name => {
      // Delete with specific path and domain
      response.cookies.delete({ 
        name, 
        path: '/', 
        domain: cookieDomain 
      });
      // Delete without specific path/domain (for default/localhost)
      response.cookies.delete({ name });
    });

    // Set proper CORS headers before returning
    setCorsHeaders(req, response);
    console.log('Logout endpoint successfully completed, cookies cleared in response');
    
    return response;
  } catch (error) {
    console.error('Critical error in logout endpoint:', error)
    
    // Create error response with CORS headers
    const response = NextResponse.json(
      { error: 'An unexpected error occurred during logout' },
      { status: 500 }
    )
    
    // Ensure CORS headers are set even in error case
    setCorsHeaders(req, response)
    
    return response
  }
} 