import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isOriginAllowed, setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

/**
 * Handle OPTIONS requests (CORS preflight)
 * Safari needs a 200 response with proper CORS headers
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req)
}

/**
 * Token endpoint for Supabase authentication
 * This route proxies password grant requests to avoid CORS issues with credentials
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body
    
    if (!email || !password) {
      const response = NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
      setCorsHeaders(req, response)
      return response
    }
    
    // Create a direct Supabase client (no cookies)
    const supabase = createSupabaseServerClient()
    
    // Handle sign-in on the server side
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('Auth token error:', error.message)
      const response = NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
      setCorsHeaders(req, response)
      return response
    }
    
    // Log successful authentication
    console.log(`Successful auth for ${email.substring(0, 3)}*** via token endpoint`)
    
    // Return the session data with proper CORS headers, exactly matching Supabase's response format
    const response = NextResponse.json({
      access_token: data.session.access_token,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: data.session.refresh_token,
      user: data.user
    })
    setCorsHeaders(req, response)
    return response
  } catch (error) {
    console.error('Auth token error:', error)
    const response = NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
    setCorsHeaders(req, response)
    return response
  }
} 