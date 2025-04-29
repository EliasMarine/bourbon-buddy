import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { updateSession } from '@/utils/supabase/middleware';

// Helper to generate a debug ID for tracing requests through logs
function generateDebugId() {
  return Math.random().toString(36).substring(2, 8);
}

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

// Helper to check if a path matches any of the patterns
function isPathMatch(path: string, patterns: string[]) {
  return patterns.some(pattern => 
    path.startsWith(pattern) || 
    path.includes(pattern) || 
    path === pattern
  );
}

// Handle HTTP to HTTPS upgrade for external resources
function externalResourceMiddleware(req: NextRequest) {
  const debugId = generateDebugId();
  
  try {
    // Only run this middleware for image requests
    if (
      req.nextUrl.pathname.endsWith('.jpg') ||
      req.nextUrl.pathname.endsWith('.jpeg') ||
      req.nextUrl.pathname.endsWith('.png') ||
      req.nextUrl.pathname.endsWith('.gif') ||
      req.nextUrl.pathname.endsWith('.webp')
    ) {
      const url = req.nextUrl.clone();
      const referer = req.headers.get('referer');
      
      // If the URL is HTTP and we're on HTTPS, upgrade it
      if (url.protocol === 'http:' && (referer && referer.startsWith('https:'))) {
        url.protocol = 'https:';
        console.log(`[${debugId}] 🔒 Upgrading resource from HTTP to HTTPS: ${url.toString()}`);
        return NextResponse.redirect(url);
      }
    }
    
    return null; // Continue to next middleware
  } catch (error) {
    console.error(`[${debugId}] ❌ Error in externalResourceMiddleware:`, error);
    // Don't block the request if middleware fails
    return null;
  }
}

// Extract code from URL for auth sessions (password reset flows)
function extractAuthCode(req: NextRequest): string | null {
  // Check for code parameter in URL
  const code = req.nextUrl.searchParams.get('code');
  if (code) return code;
  
  // Also check for auth code in hash fragment (needed for some auth flows)
  const url = req.url;
  if (url.includes('#')) {
    try {
      // Convert hash fragment to searchParams to extract code
      const hashPart = url.split('#')[1];
      const params = new URLSearchParams(hashPart);
      return params.get('code');
    } catch (error) {
      console.error('Error extracting auth code from hash:', error);
    }
  }
  
  return null;
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
  '/signup',
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
      style-src 'self' 'nonce-${nonce}' https://vercel.com;
    `;
  }
  
  // Vercel Preview: Add unsafe-inline for preview feedback features
  if (isVercelPreview) {
    return `
      ${baseDirectives}
      script-src 'self' 'nonce-${nonce}' https://www.gstatic.com https://assets.mux.com https://vercel.live https://vercel.com 'unsafe-inline';
      style-src 'self' 'nonce-${nonce}' https://vercel.com;
    `;
  }
  
  // Production: strictest CSP with nonces
  return `
    ${baseDirectives}
    script-src 'self' 'nonce-${nonce}' https://www.gstatic.com https://assets.mux.com https://vercel.live https://vercel.com 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}' https://vercel.com;
  `;
}

// Supabase-related cookies to monitor
const supabaseCookies = ['sb-access-token', 'sb-refresh-token']

// List of allowed domains
const allowedDomains = getAllowedDomains()

// Helper function to get the base path from a URL
function getBasePath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments.length > 0 ? `/${segments[0]}` : '/';
}

/**
 * Auth middleware for handling authentication and authorization
 */
export async function middleware(request: NextRequest) {
  // Skip CSP for static assets to improve performance
  const { pathname } = request.nextUrl;
  const skipCSP = staticAssetPatterns.some(pattern => 
    typeof pattern === 'string' 
      ? pathname.includes(pattern) 
      : pattern.test(pathname)
  );

  // Generate CSP nonce for this request
  const nonce = skipCSP ? '' : generateCSPNonce();
  
  // Create modified request headers with nonce
  const requestHeaders = new Headers(request.headers);
  if (!skipCSP) {
    requestHeaders.set('x-nonce', nonce);
  }
  
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Apply CSP with nonce if not skipping
  if (!skipCSP) {
    const contentSecurityPolicy = createCSPHeader(nonce)
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    // Set CSP header in the response
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  }

  // Create Supabase client with correct cookie handling pattern
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
              request,
            })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  await supabase.auth.getUser();

  // Check if user is authenticated for protected routes
  const isAuthRoute = pathname.startsWith('/login') || 
                     pathname.startsWith('/signup') || 
                     pathname.startsWith('/auth');
                     
  const isApiRoute = pathname.startsWith('/api');
  const isPublicRoute = pathname === '/' || 
                       pathname.startsWith('/public') || 
                       isApiRoute;
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user && !isAuthRoute && !isPublicRoute) {
    // Redirect to login if trying to access protected routes without auth
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }
  
  if (user && isAuthRoute) {
    // Redirect to dashboard if already authenticated
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
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