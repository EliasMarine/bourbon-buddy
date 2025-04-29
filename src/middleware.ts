import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import crypto from 'crypto'

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

// Generate a cryptographically random nonce for CSP
function generateCSPNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

// Create Content Security Policy with nonce
function createCSPHeader(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isVercelPreview = process.env.VERCEL_ENV === 'preview' || 
                          process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  
  // Base CSP directives common to all environments
  const baseDirectives = `
    default-src 'self';
    font-src 'self' https://vercel.live;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    img-src 'self' data: blob: https://image.mux.com https://vercel.live https://vercel.com https://*.pusher.com/;
    media-src 'self' blob: https://stream.mux.com https://assets.mux.com https://image.mux.com https://*.mux.com https://*.fastly.mux.com https://*.cloudflare.mux.com;
    connect-src 'self' https://hjodvataujilredguzig.supabase.co wss://hjodvataujilredguzig.supabase.co https://api.mux.com https://inferred.litix.io https://stream.mux.com https://assets.mux.com https://*.mux.com https://*.fastly.mux.com https://*.cloudflare.mux.com https://storage.googleapis.com https://vercel.live https://vercel.com https://*.pusher.com wss://*.pusher.com https://vitals.vercel-insights.com;
    frame-src 'self' https://vercel.live https://vercel.com;
    upgrade-insecure-requests;
  `;

  // Development mode: add unsafe-eval for hot reloading and more permissive settings
  if (isDevelopment) {
    return `
      ${baseDirectives}
      script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://www.gstatic.com https://assets.mux.com https://vercel.live https://vercel.com;
      style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://vercel.com;
    `;
  }
  
  // Vercel Preview: Add unsafe-inline for preview feedback features
  if (isVercelPreview) {
    return `
      ${baseDirectives}
      script-src 'self' 'nonce-${nonce}' https://www.gstatic.com https://assets.mux.com https://vercel.live https://vercel.com 'unsafe-inline';
      style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://vercel.com;
    `;
  }
  
  // Production: strictest CSP with nonces
  return `
    ${baseDirectives}
    script-src 'self' 'nonce-${nonce}' https://www.gstatic.com https://assets.mux.com https://vercel.live https://vercel.com 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://vercel.com;
  `;
}

/**
 * Next.js Middleware for SSR authentication and route protection.
 * - Adds CSP headers with nonces
 * - Handles Supabase SSR auth and route protection
 */
export async function middleware(request: NextRequest) {
  const url = new URL(request.url)
  const path = url.pathname

  // Skip static assets for performance
  const isStaticAsset = staticAssetPatterns.some(pattern => pattern.test(path))
  
  // Generate CSP nonce for this request
  const nonce = isStaticAsset ? '' : generateCSPNonce();
  
  // Create modified request headers with nonce
  const requestHeaders = new Headers(request.headers);
  if (!isStaticAsset) {
    requestHeaders.set('x-nonce', nonce);
  }
  
  // Create response for cookie handling
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  
  // Generate the CSP header once for consistency
  const contentSecurityPolicy = !isStaticAsset 
    ? createCSPHeader(nonce).replace(/\s{2,}/g, ' ').trim()
    : '';
  
  // Apply CSP with nonce if not a static asset
  if (!isStaticAsset) {
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  }
  
  // Skip public routes
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route))
  if (isPublicRoute) return response;
  
  // Create Supabase client for SSR auth with correct cookie pattern
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
            request.cookies.set(name, value)
            response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            })
            response.cookies.set(name, value, options)
            
            // Re-apply CSP header after cookie changes
            if (!isStaticAsset) {
              response.headers.set('Content-Security-Policy', contentSecurityPolicy);
            }
          })
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
  return response
}
