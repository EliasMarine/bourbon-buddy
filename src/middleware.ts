import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { generateDebugId } from '@/lib/debug-utils'

// Helper function to determine if verbose logging is enabled
function isVerboseLoggingEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUTH === 'true';
}

// Custom logger that respects the environment settings
function log(debugId: string, message: string, data?: any) {
  if (isVerboseLoggingEnabled()) {
    if (data) {
      console.log(`[${debugId}] ${message}`, data);
    } else {
      console.log(`[${debugId}] ${message}`);
    }
  }
}

// Error logger (always logs errors even in production)
function logError(debugId: string, message: string, error: any) {
  console.error(`[${debugId}] ${message}`, error);
}

// Protected routes requiring authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/streams/create',
  '/collection',
  '/api/collection',
  '/api/spirits/',
  '/api/users/',
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

// Get allowed domains from env
function getAllowedDomains(): string[] {
  const domains = [
    'bourbonbuddy.live',
    'bourbon-buddy.vercel.app'
  ]
  
  // Add any domains from env vars
  if (process.env.ALLOWED_DEV_ORIGINS) {
    const envDomains = process.env.ALLOWED_DEV_ORIGINS.split(',')
      .map(d => d.trim())
      .filter(Boolean)
      
    domains.push(...envDomains.map(url => {
      try {
        // Extract just the hostname from URLs
        return new URL(url).hostname
      } catch (e) {
        return url // If not a valid URL, use as is
      }
    }))
  }
  
  // Add localhost for development
  if (process.env.NODE_ENV !== 'production') {
    domains.push('localhost')
  }
  
  // Use Array.from to convert Set to Array for better TypeScript compatibility
  return Array.from(new Set(domains))
}

// CSRF-related cookie paths that need special handling
const csrfCookies = ['csrf_secret', 'next-auth.csrf-token']

// Supabase-related cookies to monitor
const supabaseCookies = ['sb-access-token', 'sb-refresh-token']

// List of allowed domains
const allowedDomains = getAllowedDomains()

export async function middleware(request: NextRequest) {
  // Add debug ID to track individual requests through the logs
  const debugId = generateDebugId()
  log(debugId, `🔄 Middleware processing ${request.method} ${request.nextUrl.pathname}`)
  
  try {
    // Create a default response we'll modify as needed
    const response = NextResponse.next()
    
    // Add primary headers
    const headers = new Headers(response.headers)
    headers.set('x-debug-id', debugId)
    
    // Security headers
    headers.set('X-XSS-Protection', '1; mode=block')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'DENY')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Only add CSP in production to avoid local development issues
    if (process.env.NODE_ENV === 'production') {
      headers.set('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.openai.com " + 
        allowedDomains.map(domain => `https://${domain}`).join(' ')
      )
    }
    
    // Skip processing for static assets to improve performance
    const isStaticAsset = staticAssetPatterns.some(pattern => 
      pattern.test(request.nextUrl.pathname)
    )
    
    if (isStaticAsset) {
      log(debugId, `📦 Static asset, skipping auth check: ${request.nextUrl.pathname}`)
      return response
    }
    
    // Determine if this is a public path that doesn't need authentication
    const isPublicPath = publicRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )
    
    if (isPublicPath) {
      log(debugId, `🔓 Public path, skipping auth check: ${request.nextUrl.pathname}`)
      return response
    }
    
    // Skip WebSocket upgrade requests
    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      log(debugId, `🔌 WebSocket upgrade request detected`);
      return response
    }
    
    // Check for debugging cookies from browser dev tools
    const debugCookie = request.cookies.get('bourbon_buddy_debug')
    if (debugCookie) {
      log(debugId, `🧪 Debug cookie found: ${debugCookie.value}`)
    }
    
    // Get the domain for better error reporting
    const domain = request.headers.get('host') || 'unknown'
    
    // Check specifically for Supabase cookies
    const supabaseCookieValues = supabaseCookies.map(name => {
      const cookie = request.cookies.get(name)
      return {
        name,
        exists: !!cookie,
        length: cookie?.value?.length || 0
      }
    })
    
    log(debugId, `🍪 Supabase cookies:`, supabaseCookieValues);
    
    // Create the Supabase client
    log(debugId, `🔑 Creating Supabase client with URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 15)}...`);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            log(debugId, `🍪 getAll cookies called for Supabase client`)
            const cookies = request.cookies.getAll()
            
            // Log presence of auth cookies specifically
            const authCookies = cookies.filter(c => 
              supabaseCookies.includes(c.name)
            )
            
            if (authCookies.length > 0) {
              log(debugId, `🍪 Found Supabase auth cookies:`, 
                authCookies.map(c => ({ name: c.name, length: c.value.length }))
              )
            } else {
              log(debugId, `⚠️ No Supabase auth cookies found`)
            }
            
            return cookies
          },
          setAll(cookiesToSet) {
            log(debugId, `🍪 setAll called with ${cookiesToSet.length} cookies`)
            
            // Apply cookies to the response
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
              log(debugId, `🍪 Setting cookie: ${name}, length: ${value.length}`)
            })
            
            // Return void - this matches the expected type signature
            return
          }
        }
      }
    )
    
    // Fetch the session with detailed error handling
    log(debugId, `🔑 Fetching Supabase auth session`)
    let sessionResult
    
    try {
      sessionResult = await supabase.auth.getSession()
      
      if (sessionResult.error) {
        logError(debugId, `❌ Supabase session error:`, sessionResult.error.message)
      }
    } catch (error) {
      logError(debugId, `🔥 Critical error fetching session:`, error)
      
      // Return a friendlier error response in production
      if (process.env.NODE_ENV === 'production') {
        // Let users continue their browsing experience despite auth errors
        return response
      }
    }
    
    const session = sessionResult?.data.session
    
    // Check if user is authenticated via Supabase
    let isAuthenticated = !!session
    let userName = session?.user?.email || null
    
    // Check for NextAuth session cookie as fallback
    const nextAuthSessionCookie = request.cookies.get('next-auth.session-token')
    const hasNextAuthSession = !!nextAuthSessionCookie
    
    log(debugId, `🔐 Auth state: Supabase=${isAuthenticated}, NextAuth=${hasNextAuthSession}`)
    
    // Log more details about the session if present
    if (session) {
      log(debugId, `👤 User authenticated: ${session.user.email}`)
      
      // Add user info to response headers for server components
      response.headers.set('x-user-id', session.user.id)
      if (session.user.email) {
        response.headers.set('x-user-email', session.user.email)
      }
    } else if (hasNextAuthSession) {
      log(debugId, `👤 No Supabase session, but NextAuth session is present`)
      // We'll fallback to using the NextAuth authentication for transition
      isAuthenticated = true
    } else {
      log(debugId, `👤 User not authenticated`)
    }
    
    // Check if this is a protected route
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )
    
    // Check if URL requires authentication
    if (isProtectedRoute && !isAuthenticated) {
      log(debugId, `🔒 Protected route access attempt without authentication: ${request.nextUrl.pathname}`)
      
      // For API routes, return 401 instead of redirecting
      if (request.nextUrl.pathname.startsWith('/api/')) {
        log(debugId, `🚫 API access denied, returning 401`)
        return new NextResponse(
          JSON.stringify({ 
            error: 'Authentication required',
            status: 'unauthorized',
            message: 'Please sign in to access this resource'
          }),
          { 
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...Object.fromEntries(headers)
            }
          }
        )
      }
      
      // For regular routes, redirect to login
      log(debugId, `🔄 Redirecting to login page`)
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
      
      return NextResponse.redirect(redirectUrl, {
        headers: Object.fromEntries(headers)
      })
    }
    
    // Apply all headers to the response
    // Convert headers to an object for better compatibility
    const headerEntries = Array.from(headers.entries())
    headerEntries.forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    log(debugId, `✅ Middleware processing complete`)
    return response
  } catch (error) {
    logError(debugId, `🔥 Critical middleware error:`, error)
    
    // In production, don't block the request even if middleware fails
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[${debugId}] ⚠️ Bypassing middleware due to critical error`)
      return NextResponse.next()
    }
    
    // In development, show the error
    return new NextResponse(
      JSON.stringify({ 
        error: 'Middleware failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 