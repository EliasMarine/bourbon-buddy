import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Protected routes requiring authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/streams/create',
  '/collection',
  '/api/collection',
  '/api/spirits/',
  '/api/user/',
  '/api/upload',
  '/api/protected'
]

// Public routes accessible without authentication
const publicRoutes = [
  '/login',
  '/auth',
  '/api/auth',
  '/api/csrf',
  '/api/status',
  '/_next',
  '/static',
  '/images',
  '/favicon.ico'
]

// Static asset patterns to ignore
const staticAssetPatterns = [
  /\.(jpe?g|png|gif|webp|svg|ico)$/i,
  /\.(css|js|map)$/i,
  /^\/socket\.io\//,
  /^\/api\/socketio/
]

// CSRF-related cookie paths that need special handling
const csrfCookies = ['csrf_secret', 'next-auth.csrf-token']

export async function middleware(request: NextRequest) {
  try {
    // Create a response object that we'll modify and return
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    // Initialize security headers
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Referrer-Policy', 'no-referrer')
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=()')
    response.headers.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.openai.com https://bourbonbuddy.live"
    )

    // Log CSRF cookies for debugging
    const csrfCookieValues = csrfCookies.map(name => {
      const cookie = request.cookies.get(name)
      return {
        name,
        exists: !!cookie,
        length: cookie?.value?.length
      }
    })
    console.log('CSRF cookies in middleware:', csrfCookieValues)

    // Create the Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Set cookies on both request and response
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // CRITICAL: Fetch the session and user with error handling
    let session = null
    let user = null

    try {
      // Get session first - this is crucial for auth flow
      const sessionRes = await supabase.auth.getSession()
      session = sessionRes.data.session
      
      // If we have a session, ensure it's refreshed if needed
      if (session) {
        try {
          await supabase.auth.setSession(session)
        } catch (refreshError) {
          console.error('Error refreshing session:', refreshError)
          // Continue with the existing session if refresh fails
        }
      }
      
      // Get user after potential session refresh
      const userRes = await supabase.auth.getUser()
      user = userRes.data.user
      
      // BONUS: Add user information to headers for downstream usage
      if (user) {
        // Use internal headers that won't be exposed to client
        // These are accessible in server components/API routes
        request.headers.set('x-user-id', user.id)
        
        // If user has custom claims or roles, add those too
        if (user.app_metadata?.role) {
          request.headers.set('x-user-role', user.app_metadata.role)
        }
        
        // Also set headers on the response for edge functions
        response.headers.set('x-user-id', user.id)
        if (user.app_metadata?.role) {
          response.headers.set('x-user-role', user.app_metadata.role)
        }
      }
      
      // Log for debugging
      console.log('Auth check in middleware:', {
        hasSession: !!session,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email?.substring(0, 3) + '***' // Partial for privacy
      })
    } catch (authError) {
      console.error('Supabase auth error in middleware:', authError)
      // Continue without session/user - will redirect as needed
    }
    
    // Check if this is a static asset request
    const isStaticAsset = staticAssetPatterns.some(pattern => 
      pattern.test(request.nextUrl.pathname)
    )
    
    // Check if this is a public route
    const isPublicRoute = publicRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )
    
    // Skip auth checks for static assets and public routes
    if (isStaticAsset || isPublicRoute) {
      return response
    }
    
    // Handle WebSocket upgrade requests
    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      return response
    }
    
    // Check if this is a protected route
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )
    
    // For protected routes, apply auth check
    if (isProtectedRoute) {
      // If no user, return unauthorized response or redirect
      if (!user) {
        // Return JSON error for API routes
        if (request.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Unauthorized', message: 'Authentication required' },
            { status: 401, headers: response.headers }
          )
        }
        
        // Redirect to login page for non-API routes
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
        
        // Preserve the security headers in the redirect
        const redirectResponse = NextResponse.redirect(redirectUrl)
        
        // Copy over all headers including security headers
        // Use Array.from to handle the Headers iterator properly for TypeScript
        Array.from(response.headers.entries()).forEach(([key, value]) => {
          redirectResponse.headers.set(key, value)
        })
        
        return redirectResponse
      }
      
      // User is authenticated, add cache control headers
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
    }
    
    return response
  } catch (error) {
    console.error('Middleware error:', error)
    // Return basic response on error to avoid crashing
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // Match all paths except for static assets
    '/:path*',
    '/_next/data/:path*',
  ],
} 