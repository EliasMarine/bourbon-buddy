import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req)
}

/**
 * Authentication token endpoint
 * This endpoint handles authentication requests without CORS issues
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Auth token endpoint called')
    
    // Parse the request body
    const body = await req.json()
    const { email, password } = body
    
    if (!email || !password) {
      console.error('Invalid auth request: missing email or password')
      const response = NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
      setCorsHeaders(req, response)
      return response
    }
    
    // Create a server-side Supabase client
    const supabase = createSupabaseServerClient()
    
    // Attempt to sign in - this will create a session if successful
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('Auth error:', error.message)
      
      // Return descriptive error with proper CORS headers
      const response = NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
      setCorsHeaders(req, response)
      return response
    }
    
    if (!data.session) {
      console.error('Auth error: No session returned')
      const response = NextResponse.json(
        { error: 'Authentication failed - no session' },
        { status: 500 }
      )
      setCorsHeaders(req, response)
      return response
    }
    
    console.log('Login successful, setting session data')
    
    // Return the session data in a format expected by the frontend
    const response = NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: 3600, // Default expiry time in seconds
      token_type: 'bearer',
      user: data.user
    })
    
    // Set proper CORS headers and cookies
    setCorsHeaders(req, response)
    
    return response
  } catch (error) {
    console.error('Critical error in auth token endpoint:', error)
    
    // Create error response with CORS headers
    const response = NextResponse.json(
      { error: 'An unexpected error occurred during authentication' },
      { status: 500 }
    )
    
    // Ensure CORS headers are set even in error case
    setCorsHeaders(req, response)
    
    return response
  }
} 