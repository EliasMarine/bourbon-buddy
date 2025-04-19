import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-middleware'

/**
 * Updates auth session for middleware.
 * This is critical for ensuring smooth auth flows - it handles cookie refresh
 * and maintains consistent auth state across requests.
 */
export async function updateSession(request: NextRequest) {
  try {
    // Create a Supabase client for the middleware
    const { supabase, response } = createMiddlewareClient(request)

    // Add proper headers to prevent caching sensitive auth responses
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    // Refresh the session - this will update cookies if needed
    await supabase.auth.getSession()

    return response
  } catch (error) {
    console.error('Error updating session in middleware:', error)
    // Return a default response if there's an error
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }
} 