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
  // Add debug ID to track individual requests through the logs
  const debugId = Math.random().toString(36).substring(2, 8);
  console.log(`[${debugId}] 🔍 Middleware start: ${request.method} ${request.nextUrl.pathname}`);
  
  try {
    // First, quickly check if this is a static asset request
    const isStaticAsset = staticAssetPatterns.some(pattern => 
      pattern.test(request.nextUrl.pathname)
    )
    
    // Check if this is a path that starts with public routes
    const isPublicRoute = publicRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )
    
    console.log(`[${debugId}] Route type: ${isStaticAsset ? 'Static asset' : isPublicRoute ? 'Public route' : 'Protected route'}`);
    
    // Skip full processing for static assets and typical public paths
    // Just return a standard response with basic security headers
    if (isStaticAsset || isPublicRoute) {
      const response = NextResponse.next()
      
      // Add minimal required security headers
      response.headers.set('X-Content-Type-Options', 'nosniff')
      
      // Add cache control for static assets
      if (isStaticAsset || request.nextUrl.pathname.startsWith('/_next/')) {
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      }
      
      console.log(`[${debugId}] 🟢 Quick pass for ${isStaticAsset ? 'static asset' : 'public route'}`);
      return response
    }
    
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

    // Only check CSRF cookies for non-static routes
    if (request.nextUrl.pathname.includes('/api/') || 
        !request.nextUrl.pathname.includes('/_next/')) {
      const csrfCookieValues = csrfCookies.map(name => {
        const cookie = request.cookies.get(name)
        return {
          name,
          exists: !!cookie,
          length: cookie?.value?.length
        }
      })
      
      // Always log in production to help debug auth issues
      console.log(`[${debugId}] 🍪 CSRF cookies in middleware:`, csrfCookieValues);
    }

    // Debug: Log all cookies present in the request (with caution for sensitive data)
    const allCookies = request.cookies.getAll().map(cookie => {
      // Mask sensitive values but show existence and length
      const isSensitive = ['sb-access-token', 'sb-refresh-token', 'next-auth.session-token'].includes(cookie.name);
      return {
        name: cookie.name,
        exists: true,
        length: cookie.value.length,
        value: isSensitive ? '***' : cookie.value.substring(0, 5) + '...'
      };
    });
    console.log(`[${debugId}] 🍪 All cookies:`, allCookies);

    // Create the Supabase client
    console.log(`[${debugId}] 🔑 Creating Supabase client with URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 15)}...`);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            console.log(`[${debugId}] 🍪 getAll cookies called in Supabase client`);
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            console.log(`[${debugId}] 🍪 setAll cookies called in Supabase client with ${cookiesToSet.length} cookies`);
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log(`[${debugId}] 🍪 Setting cookie: ${name}, length: ${value.length}, options: ${JSON.stringify(options)}`);
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
      console.log(`[${debugId}] 🔐 Fetching Supabase auth session`);
      const sessionStartTime = Date.now();
      const sessionRes = await supabase.auth.getSession()
      console.log(`[${debugId}] ⏱️ getSession took ${Date.now() - sessionStartTime}ms`);
      session = sessionRes.data.session
      
      if (session) {
        console.log(`[${debugId}] ✅ Found valid session, expiry: ${new Date(session.expires_at! * 1000).toISOString()}`);
        // If we have a session, ensure it's refreshed if needed
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = session.expires_at || 0;
        const timeRemaining = expiresAt - now;
        
        console.log(`[${debugId}] ⏳ Session expires in ${timeRemaining} seconds`);

        // If session expires in less than 5 minutes, refresh it
        if (timeRemaining < 300) {
          console.log(`[${debugId}] 🔄 Session expiring soon, refreshing...`);
          try {
            const refreshStartTime = Date.now();
            await supabase.auth.setSession(session)
            console.log(`[${debugId}] ⏱️ setSession refresh took ${Date.now() - refreshStartTime}ms`);
          } catch (refreshError) {
            console.error(`[${debugId}] ❌ Error refreshing session:`, refreshError)
            // Continue with the existing session if refresh fails
          }
        }
      } else {
        console.log(`[${debugId}] ⚠️ No session found`);
      }
      
      // Get user after potential session refresh
      console.log(`[${debugId}] 👤 Fetching user details`);
      const userStartTime = Date.now();
      const userRes = await supabase.auth.getUser()
      console.log(`[${debugId}] ⏱️ getUser took ${Date.now() - userStartTime}ms`);
      user = userRes.data.user
      
      if (user) {
        console.log(`[${debugId}] ✅ User authenticated: ${user.id.substring(0, 8)}...`);
        // Use internal headers that won't be exposed to client
        // These are accessible in server components/API routes
        request.headers.set('x-user-id', user.id)
        
        // If user has custom claims or roles, add those too
        if (user.app_metadata?.role) {
          console.log(`[${debugId}] 🔑 User role: ${user.app_metadata.role}`);
          request.headers.set('x-user-role', user.app_metadata.role)
        }
        
        // Also set headers on the response for edge functions
        response.headers.set('x-user-id', user.id)
        if (user.app_metadata?.role) {
          response.headers.set('x-user-role', user.app_metadata.role)
        }
      } else {
        console.log(`[${debugId}] ⚠️ No user found`);
      }
    } catch (authError) {
      console.error(`[${debugId}] ❌ Supabase auth error in middleware:`, authError)
      // Continue without session/user - will redirect as needed
    }
    
    // Handle WebSocket upgrade requests
    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      console.log(`[${debugId}] 🔌 WebSocket upgrade request detected`);
      return response
    }
    
    // Check if this is a protected route
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )
    
    console.log(`[${debugId}] 🔒 Protected route check: ${isProtectedRoute ? 'Yes' : 'No'} for ${request.nextUrl.pathname}`);
    
    // For protected routes, apply auth check
    if (isProtectedRoute) {
      // If no user, return unauthorized response or redirect
      if (!user) {
        console.log(`[${debugId}] 🚫 Unauthorized access to protected route: ${request.nextUrl.pathname}`);
        
        // Return JSON error for API routes
        if (request.nextUrl.pathname.startsWith('/api/')) {
          console.log(`[${debugId}] 🚫 Returning 401 for API route`);
          return NextResponse.json(
            { error: 'Unauthorized', message: 'Authentication required' },
            { status: 401, headers: response.headers }
          )
        }
        
        // Redirect to login page for non-API routes
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
        
        console.log(`[${debugId}] 🔄 Redirecting to login: ${redirectUrl.toString()}`);
        
        // Preserve the security headers in the redirect
        const redirectResponse = NextResponse.redirect(redirectUrl)
        
        // Copy over all headers including security headers
        // Use Array.from to handle the Headers iterator properly for TypeScript
        Array.from(response.headers.entries()).forEach(([key, value]) => {
          redirectResponse.headers.set(key, value)
        })
        
        return redirectResponse
      }
      
      console.log(`[${debugId}] ✅ User authenticated for protected route: ${request.nextUrl.pathname}`);
      
      // User is authenticated, add cache control headers
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
    }
    
    console.log(`[${debugId}] 🟢 Middleware complete for: ${request.nextUrl.pathname}`);
    return response
  } catch (error) {
    console.error(`[${debugId}] ❌ Middleware error:`, error)
    // Return basic response on error to avoid crashing
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    // Match all paths except for common static assets
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'
  ],
} 