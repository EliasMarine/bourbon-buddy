import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Updates auth session for middleware.
 * This is critical for ensuring smooth auth flows - it handles cookie refresh
 * and maintains consistent auth state across requests.
 */
export async function updateSession(request: NextRequest) {
  // Create a clone of the request headers
  const requestHeaders = new Headers(request.headers)
  
  // Include a session debug ID for tracing
  const debugId = Math.random().toString(36).substring(2, 8)
  requestHeaders.set('x-supabase-session-debug', debugId)
  
  // Create an initial response to modify
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Add proper headers to prevent caching sensitive auth responses
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

  try {
    // Create a Supabase client specifically for session management
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Create a new response to apply cookies
            response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            })
            
            // Add cache control headers again to the new response
            response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
            response.headers.set('Pragma', 'no-cache')
            response.headers.set('Expires', '0')
            
            // Apply cookies to both request and response
            cookiesToSet.forEach(({ name, value, options }) => {
              // Apply to request (needed for current middleware execution)
              request.cookies.set(name, value)
              
              // Apply to response (needed for browser)
              response.cookies.set({
                name,
                value,
                ...options,
                // Add secure flag in production or HTTPS environments
                ...(process.env.NODE_ENV === 'production' || 
                   request.url.includes('https') 
                  ? { secure: true } 
                  : {})
              })
            })
            
            return response
          },
        },
      }
    )

    // This will refresh the session if needed
    const { data } = await supabase.auth.getUser()
    
    // In development, add debugging headers
    if (process.env.NODE_ENV !== 'production') {
      response.headers.set('x-supabase-auth-status', data.user ? 'authenticated' : 'unauthenticated')
      response.headers.set('x-supabase-session-debug-id', debugId)
    }

    return response
  } catch (error) {
    console.error(`[${debugId}] Error updating session in middleware:`, error)
    // Return the original response if there's an error
    // Important: Don't block the request even if session refresh fails
    return response
  }
} 