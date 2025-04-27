import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// List of protected routes (require authentication)
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
  '/api/protected',
]

// List of public routes (no authentication required)
const publicRoutes = [
  '/login',
  '/signup',
  '/auth',
  '/api/auth',
  '/api/csrf',
  '/api/status',
  '/_next',
  '/static',
  '/images',
  '/favicon.ico',
]

// Patterns for static assets to skip
const staticAssetPatterns = [
  /\.(jpe?g|png|gif|webp|svg|ico)$/i,
  /\.(css|js|map)$/i,
  /^\/socket\.io\//,
  /^\/api\/socketio/
]

export const config = {
  matcher: [
    // Match all request paths except for static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|public/|static/).*)',
  ],
}

/**
 * Next.js Middleware for SSR authentication and route protection.
 * - Does NOT set any security headers (handled in next.config.js)
 * - Only handles Supabase SSR auth, route protection, and logging
 */
export async function middleware(request: NextRequest) {
  const url = new URL(request.url)
  const path = url.pathname

  // Skip static assets for performance
  const isStaticAsset = staticAssetPatterns.some(pattern => pattern.test(path))
  if (isStaticAsset) return NextResponse.next()

  // Skip public routes
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route))
  if (isPublicRoute) return NextResponse.next()
    
  // Create Supabase client for SSR auth
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
          // No-op: handled by Next.js response
          },
        },
      }
    )
    
  // Get user session
    const { data: { user } } = await supabase.auth.getUser()
    
  // If route is protected and user is not authenticated, redirect to login
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
    if (isProtectedRoute && !user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', path)
      return NextResponse.redirect(redirectUrl)
    }
    
  // If authenticated or not a protected route, continue
    return NextResponse.next()
}
