import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase'

// Define which routes should be protected by authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/streams/create',
  '/api/'
]

// Define public routes that should be accessible without authentication
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

// Define static asset paths to ignore
const staticAssetPatterns = [
  /\.(jpe?g|png|gif|webp|svg|ico)$/i,
  /\.(css|js|map)$/i,
  /^\/socket\.io\//,
  /^\/api\/socketio/
]

export async function middleware(request: NextRequest) {
  try {
    // Initialize response with security headers
    const { supabase, response } = createMiddlewareClient(request)
    
    // Add security headers
    const headers = response.headers
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'DENY')
    headers.set('Referrer-Policy', 'no-referrer')
    headers.set('Permissions-Policy', 'geolocation=(), microphone=()')
    
    // Set Content Security Policy
    headers.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.openai.com https://bourbonbuddy.live"
    )

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
      // Refresh the user's session
      const { data: { user } } = await supabase.auth.getUser()
      
      // If no user, redirect to login
      if (!user) {
        // Return JSON error for API routes
        if (request.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }
        
        // Redirect to login page for non-API routes
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }
      
      // User is authenticated, add cache control headers
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      headers.set('Pragma', 'no-cache')
      headers.set('Expires', '0')
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