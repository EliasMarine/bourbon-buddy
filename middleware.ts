import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase-middleware';
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
  // Skip processing for WebSocket upgrade requests
  if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    return NextResponse.next();
  }
  
  // Skip processing for static assets to improve performance
  const isStaticAsset = staticAssetPatterns.some(pattern => 
    pattern.test(request.nextUrl.pathname)
  );
  
  if (isStaticAsset) {
    return NextResponse.next();
  }
  
  // Get the pathname for route checking
  const pathname = request.nextUrl.pathname;
  
  // Check if this is an auth-related path (login, signup, auth callbacks)
  const isAuthPath = pathname.startsWith('/login') || 
                     pathname.startsWith('/signup') || 
                     pathname.startsWith('/auth');
  
  // First, update the Supabase session using the dedicated function
  // This ensures we have the most up-to-date auth state before making decisions
  const response = await updateSession(request);
  
  // Add security headers
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // For public paths, just return the updated response
  const isPublicPath = publicRoutes.some(route => pathname.startsWith(route));
  if (isPublicPath) {
    return response;
  }
  
  // For protected routes, check if user is authenticated
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  if (isProtectedRoute) {
    // Create a client to check auth state
    const { supabase } = createMiddlewareClient(request);
    
    // Get the user to check authentication
    const { data } = await supabase.auth.getUser();
    
    // If no user found for a protected route, redirect to login
    if (!data.user && isProtectedRoute) {
      // Store the original URL to redirect back after login
      const redirectUrl = new URL('/login', request.url);
      if (request.nextUrl.pathname !== '/') {
        redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      }
      return NextResponse.redirect(redirectUrl);
    }
  }
  
  // Special case: if authenticated user visits auth pages, redirect to dashboard
  if (isAuthPath) {
    // Create a client to check auth state
    const { supabase } = createMiddlewareClient(request);
    
    // Get the user to check authentication
    const { data } = await supabase.auth.getUser();
    
    // If authenticated and on auth page, redirect to dashboard or requested URL
    if (data.user) {
      const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
      const redirectUrl = callbackUrl ? callbackUrl : '/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
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