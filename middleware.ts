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
  // Add debug ID to track individual requests through the logs
  const debugId = generateDebugId()
  log(debugId, `🔄 Middleware processing ${request.method} ${request.nextUrl.pathname}`)
  
  try {
    // Skip processing for WebSocket upgrade requests
    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      log(debugId, `🔌 WebSocket upgrade request detected`);
      return NextResponse.next();
    }
    
    // Skip processing for static assets to improve performance
    const isStaticAsset = staticAssetPatterns.some(pattern => 
      pattern.test(request.nextUrl.pathname)
    );
    
    if (isStaticAsset) {
      log(debugId, `📦 Static asset, skipping auth check: ${request.nextUrl.pathname}`);
      return NextResponse.next();
    }
    
    // Get the pathname for route checking
    const pathname = request.nextUrl.pathname;
    
    // Check if this is an auth-related path (login, signup, auth callbacks)
    const isAuthPath = pathname.startsWith('/login') || 
                     pathname.startsWith('/signup') || 
                     pathname.startsWith('/auth');
    
    // First, update the Supabase session using the dedicated function
    // This ensures we have the most up-to-date auth state before any decision
    const sessionResponse = await updateSession(request);
    sessionResponse.headers.set('x-debug-id', debugId);
    
    // Determine if this is a public path that doesn't need authentication
    const isPublicPath = publicRoutes.some(route => pathname.startsWith(route));
    
    if (isPublicPath) {
      log(debugId, `🔓 Public path, skipping auth check: ${pathname}`);
      return sessionResponse;
    }
    
    // For protected routes, we need to check the auth state
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    
    if (isProtectedRoute) {
      log(debugId, `🔒 Protected route access: ${pathname}`);
      
      // Create a Supabase client to check the auth state
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                sessionResponse.cookies.set(name, value, options);
              });
            },
          },
        }
      );
      
      // Get the user to check authentication status
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      // If no user is found and this is a protected route, redirect to login
      if (!user && isProtectedRoute) {
        log(debugId, `🔒 No user found, redirecting to login`);
        
        // Remember the URL the user was trying to access for post-login redirect
        const callbackUrl = encodeURIComponent(request.nextUrl.pathname);
        const redirectUrl = new URL(`/login?callbackUrl=${callbackUrl}`, request.url);
        
        return NextResponse.redirect(redirectUrl);
      }
    }
    
    // Handle auth pages (login/signup) for already authenticated users
    if (isAuthPath) {
      log(debugId, `🔑 Auth page detected, checking if user is already authenticated`);
      
      // Create a new supabase client for this specific check
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                sessionResponse.cookies.set(name, value, options);
              });
            },
          },
        }
      );
      
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      // If user is already logged in and on an auth page, redirect to dashboard
      if (user) {
        log(debugId, `👤 User already authenticated, redirecting to dashboard`);
        
        // Get callback URL if present, otherwise default to dashboard
        const callbackUrl = request.nextUrl.searchParams.get('callbackUrl');
        const redirectUrl = callbackUrl ? decodeURIComponent(callbackUrl) : '/dashboard';
        
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }
    
    log(debugId, `✅ Middleware processing complete`);
    return sessionResponse;
  } catch (error) {
    logError(debugId, `🔥 Critical middleware error:`, error);
    
    // In production, don't block the request even if middleware fails
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[${debugId}] ⚠️ Bypassing middleware due to critical error`);
      return NextResponse.next();
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
    );
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