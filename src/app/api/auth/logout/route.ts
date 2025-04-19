import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req)
}

/**
 * Logout endpoint for Supabase authentication
 * This route handles proper logout by clearing cookies
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Logout endpoint called')
    
    // Create a response to modify with cookie clearing
    const response = NextResponse.json({ 
      message: 'Successfully logged out' 
    })
    
    // Create a Supabase server client specifically for logout
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    
    // Call Supabase's auth.signOut() to properly revoke tokens
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Supabase logout error:', error.message)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    // Clear Supabase-related cookies directly (as a fallback)
    const authCookies = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token',
      // Include project-specific cookie if available
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [
        `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1]?.split('.')[0]}-auth-token`
      ] : [])
    ]
    
    authCookies.forEach(name => {
      response.cookies.set({
        name,
        value: '',
        expires: new Date(0),
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      })
    })
    
    // Add Cache-Control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
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