import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { generateDebugId } from '@/lib/debug-utils'
import crypto from 'crypto'

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

// Convert arrays to Sets for O(1) lookups
const protectedRoutesSet = new Set(protectedRoutes.map(route => {
  // If the route ends with a slash like '/api/spirits/', we want the base path
  return route.endsWith('/') ? route.slice(0, -1) : route;
}));

const publicRoutesSet = new Set(publicRoutes);

export async function middleware(request: NextRequest) {
  // Add debug ID to track individual requests through the logs
  const debugId = generateDebugId()
  log(debugId, `🔄 Middleware processing ${request.method} ${request.nextUrl.pathname}`)
  
  try {
    // Create a default response we'll modify as needed
    const response = NextResponse.next({
      request,
    })
    
    // Generate a random nonce for CSP
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
    
    // Add primary headers
    const headers = new Headers(response.headers)
    headers.set('x-debug-id', debugId)
    headers.set('x-nonce', nonce) // Pass nonce to layouts/pages
    
    // Security headers
    headers.set('X-XSS-Protection', '1; mode=block')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'DENY')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    /**
     * Content Security Policy (CSP) Implementation
     * 
     * We use a random nonce for each request to secure inline scripts.
     * To use this nonce in your components:
     * 
     * 1. Server components: Use headers() from next/headers to get the nonce:
     *    const nonce = headers().get('x-nonce')
     * 
     * 2. Client components: Pass the nonce as a prop from a parent server component
     * 
     * 3. Use the nonce in your script tags:
     *    <script nonce={nonce}>...</script>
     * 
     * This approach allows us to avoid 'unsafe-inline' for scripts while still
     * being able to use inline scripts when necessary.
     */
    
    // Only add CSP in production to avoid local development issues
    if (process.env.NODE_ENV === 'production') {
      headers.set('Content-Security-Policy', 
        "default-src 'self'; " +
        `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'wasm-unsafe-eval' https://www.apple.com https://appleid.cdn-apple.com https://idmsa.apple.com https://gsa.apple.com https://idmsa.apple.com.cn https://signin.apple.com https://vercel.live; ` +
        `script-src-elem 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' https://www.apple.com https://appleid.cdn-apple.com https://idmsa.apple.com https://gsa.apple.com https://idmsa.apple.com.cn https://signin.apple.com https://vercel.live; ` +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.openai.com https://vercel.live " + 
        allowedDomains.map(domain => `https://${domain}`).join(' ') + "; " +
        "worker-src 'self' blob:; " +
        "frame-src 'self' https://appleid.apple.com; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'self'; " +
        "manifest-src 'self'; " +
        "media-src 'self'; " +
        "child-src 'self' blob:;"
      )
    } else {
      // In development mode, allow specific domains but still maintain security
      // This allows Apple Sign-In to work in local development while being more secure
      const appleAuthDomains = [
        'https://appleid.cdn-apple.com',
        'https://appleid.apple.com',
        'https://www.apple.com',
        'https://signin.apple.com',
        'https://idmsa.apple.com',
        'https://gsa.apple.com',
        'https://idmsa.apple.com.cn'
      ];

      const devDomains = [
        ...allowedDomains.map(domain => `https://${domain}`),
        ...appleAuthDomains
      ].join(' ');

      headers.set('Content-Security-Policy', 
        `default-src 'self' ${devDomains} data: blob:; ` +
        `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' ${devDomains} data: blob:; ` +
        `script-src-elem 'self' 'nonce-${nonce}' 'unsafe-inline' ${devDomains}; ` +
        `connect-src 'self' ${devDomains} http://localhost:* ws://localhost:* https://*.supabase.co https://*.supabase.in wss://*.supabase.co 'unsafe-inline'; ` +
        `img-src 'self' ${devDomains} data: blob:; ` +
        `frame-src 'self' ${devDomains}; ` +
        `style-src 'self' 'unsafe-inline';`
      );
    }
    
    // Skip processing for static assets to improve performance
    const isStaticAsset = staticAssetPatterns.some(pattern => 
      pattern.test(request.nextUrl.pathname)
    )
    
    if (isStaticAsset) {
      log(debugId, `📦 Static asset, skipping auth check: ${request.nextUrl.pathname}`)
      return response
    }
    
    // Get the base path for efficient route checking
    const pathname = request.nextUrl.pathname;
    const basePath = getBasePath(pathname);

    // Determine if this is a public path that doesn't need authentication - O(1) lookup for most cases
    const isPublicPath = publicRoutesSet.has(basePath) || 
      publicRoutes.some(route => pathname.startsWith(route));

    if (isPublicPath) {
      log(debugId, `🔓 Public path, skipping auth check: ${pathname}`)
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
    
    // Updated Supabase client with correct cookie handling
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
              // Ensure cookies have proper attributes
              const domain = process.env.NODE_ENV === 'production' ? '.bourbonbuddy.live' : undefined;
              const secure = process.env.NODE_ENV === 'production';
              const cookieOptions = {
                ...options,
                domain,
                secure,
              };
              
              // Set cookies in both request and response
              request.cookies.set(name, value)
              response.cookies.set(name, value, cookieOptions)
              
              // Log cookie operations if in verbose mode
              log(debugId, `🍪 Setting cookie: ${name} (domain: ${domain || 'default'}, secure: ${secure})`);
            })
          }
        },
      }
    )
    
    // Fetch the session with detailed error handling
    log(debugId, `🔑 Fetching Supabase auth session`)
    let user = null;
    
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        logError(debugId, `❌ Supabase user error:`, error.message);
      } else if (data.user) {
        user = data.user;
        log(debugId, `👤 User authenticated: ${user.email}`);
      } else {
        log(debugId, `👤 No user found`);
      }
    } catch (error) {
      logError(debugId, `🔥 Critical error fetching user:`, error);
      
      // Return a friendlier error response in production
      if (process.env.NODE_ENV === 'production') {
        // Let users continue their browsing experience despite auth errors
        return response;
      }
    }
    
    // Check if user is authenticated
    const isAuthenticated = !!user;
    
    // Check if this is a protected route - O(1) lookup for most cases
    const isProtectedRoute = protectedRoutesSet.has(basePath) || 
      protectedRoutes.some(route => pathname.startsWith(route));
    
    // Check if URL requires authentication
    if (isProtectedRoute && !isAuthenticated) {
      log(debugId, `🔒 Protected route access attempt without authentication: ${pathname}`);
      
      // For API routes, return 401 instead of redirecting
      if (pathname.startsWith('/api/')) {
        log(debugId, `🚫 API access denied, returning 401`);
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
        );
      }
      
      // For regular routes, redirect to login
      log(debugId, `🔄 Redirecting to login page`);
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      
      return NextResponse.redirect(redirectUrl, {
        headers: Object.fromEntries(headers)
      });
    }
    
    // If authenticated, pass user info in headers for server components
    if (user) {
      response.headers.set('x-user-id', user.id);
      if (user.email) {
        response.headers.set('x-user-email', user.email);
      }
    }
    
    // Apply all headers to the response
    // Convert headers to an object for better compatibility
    const headerEntries = Array.from(headers.entries());
    headerEntries.forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    log(debugId, `✅ Middleware processing complete`);
    return response;
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