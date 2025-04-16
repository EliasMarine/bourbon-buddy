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
    
    // Skip CSRF validation in development mode to simplify local testing
    if (process.env.NODE_ENV !== 'development') {
      // Validate CSRF token
      const isValid = validateCsrfToken(req)
      if (!isValid) {
        console.error('Invalid CSRF token for logout')
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        )
      }
    } else {
      console.log('Skipping CSRF validation in development mode')
    }
    
    // Create a direct Supabase client
    const supabase = createSupabaseServerClient()
    
    // Handle logout on the server side
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
    })
    
    // Clear auth cookies directly from the response
    const authCookies = ['sb-access-token', 'sb-refresh-token', 'supabase-auth-token'];
    
    authCookies.forEach(cookieName => {
      response.cookies.set({
        name: cookieName,
        value: '',
        expires: new Date(0),
        path: '/',
        sameSite: 'lax',
      });
    });
    
    setCorsHeaders(req, response)
    return response
  } catch (error) {
    console.error('Logout error:', error)
    const response = NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
    setCorsHeaders(req, response)
    return response
  }
} 