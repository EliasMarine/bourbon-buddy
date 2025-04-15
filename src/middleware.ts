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

// Define a set to track users who have been redirected to verify-registration
// to prevent infinite redirect loops
const redirectedUsers = new Set<string>();

// Define a cleanup interval for the redirectedUsers set (clear entries older than 10 minutes)
setInterval(() => {
  redirectedUsers.clear();
}, 10 * 60 * 1000);

/**
 * Auth middleware for handling authentication and authorization
 */
export async function middleware(request: NextRequest) {
  // Add debug ID to track individual requests through the logs
  const debugId = generateDebugId()
  log(debugId, `🔄 Middleware processing ${request.method} ${request.nextUrl.pathname}`)
  
  try {
    // Create the Supabase client using cookies
    log(debugId, `🔑 Creating Supabase client with URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 15)}...`);
    
    // Create a response to modify later
    const response = NextResponse.next()
    
    // Create Supabase client with SSR
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
              // Set cookies on both request (for this run) and response (for next time)
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          }
        }
      }
    )
    
    // Generate a random nonce for CSP using Web Crypto API
    const randomBytes = crypto.getRandomValues(new Uint8Array(16))
    const nonce = btoa(String.fromCharCode.apply(null, Array.from(randomBytes)))
    
    // Add primary headers
    response.headers.set('x-debug-id', debugId)
    response.headers.set('x-nonce', nonce) // Pass nonce to layouts/pages
    
    // Security headers
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
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
      response.headers.set('Content-Security-Policy', 
        "default-src 'self'; " +
        `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'wasm-unsafe-eval' https://www.apple.com https://appleid.cdn-apple.com https://idmsa.apple.com https://gsa.apple.com https://idmsa.apple.com.cn https://signin.apple.com https://vercel.live *.clarity.ms https://c.bing.com; ` +
        `script-src-elem 'self' 'nonce-${nonce}' 'wasm-unsafe-eval' https://www.apple.com https://appleid.cdn-apple.com https://idmsa.apple.com https://gsa.apple.com https://idmsa.apple.com.cn https://signin.apple.com https://vercel.live *.clarity.ms https://c.bing.com; ` +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob: https: http:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.openai.com https://vercel.live https: http: " + 
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
      
      // Add the correct Permissions-Policy header instead of the deprecated Feature-Policy
      response.headers.set('Permissions-Policy', 
        "accelerometer=(), camera=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(self), payment=(), usb=()"
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

      const clarityDomains = [
        'https://*.clarity.ms',
        'https://c.bing.com'
      ];

      const devDomains = [
        ...allowedDomains.map(domain => `https://${domain}`),
        ...appleAuthDomains,
        ...clarityDomains
      ].join(' ');

      // More permissive CSP for development to avoid blocking scripts
      response.headers.set('Content-Security-Policy', 
        `default-src 'self' ${devDomains} data: blob:; ` +
        `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' ${devDomains} data: blob:; ` +
        `script-src-elem 'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' ${devDomains}; ` +
        `connect-src 'self' ${devDomains} http://localhost:* ws://localhost:* https://*.supabase.co https://*.supabase.in wss://*.supabase.co https: http: 'unsafe-inline'; ` +
        `img-src 'self' ${devDomains} data: blob: https: http:; ` +
        `frame-src 'self' ${devDomains}; ` +
        `style-src 'self' 'unsafe-inline';`
      );
      
      // Add the correct Permissions-Policy header for development too
      response.headers.set('Permissions-Policy', 
        "accelerometer=(), camera=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(self), payment=(), usb=()"
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
    
    // Fetch the session with detailed error handling
    log(debugId, `🔑 Fetching Supabase auth session`);
    let user = null;
    
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        logError(debugId, `❌ Supabase user error:`, error.message);
      } else if (data.user) {
        user = data.user;
        // Only log email in non-production for security
        const emailPreview = process.env.NODE_ENV === 'production' 
          ? '***' 
          : user.email?.substring(0, 3) + '***';
        log(debugId, `👤 User authenticated: ${emailPreview}`);
        
        // Check if user has the is_registered claim - this means they've been synced
        // This avoids querying the database on every request
        const isRegistered = user.app_metadata?.is_registered === true;
        log(debugId, `👤 User registration status: ${isRegistered ? 'Registered' : 'Pending'}`);
        
        // For session debugging only
        if (process.env.DEBUG_AUTH === 'true') {
          console.log(`[${debugId}] 🔐 App metadata:`, user.app_metadata);
          console.log(`[${debugId}] 🔐 User metadata:`, user.user_metadata);
          
          // Log if the user was synced recently
          const lastSynced = user.app_metadata?.last_synced_at;
          if (lastSynced) {
            const syncTime = new Date(lastSynced);
            const timeSinceSync = Date.now() - syncTime.getTime();
            console.log(`[${debugId}] 🔄 Last synced: ${timeSinceSync / 1000}s ago`);
          }
        }
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
    
    // Check if user is registered in the database system
    // Check in both app_metadata and user_metadata to be sure
    const isRegistered = user?.app_metadata?.is_registered === true || 
                         user?.user_metadata?.is_registered === true;
    
    // Check if this is a protected route - O(1) lookup for most cases
    const isProtectedRoute = protectedRoutesSet.has(basePath) || 
      protectedRoutes.some(route => pathname.startsWith(route));
    
    // For API routes, we only need authentication, not full registration
    const isApiRoute = pathname.startsWith('/api/');
    
    // Check if URL requires authentication
    if (isProtectedRoute && !isAuthenticated) {
      log(debugId, `🔒 Protected route access attempt without authentication: ${pathname}`);
      
      // For API routes, return 401 instead of redirecting
      if (isApiRoute) {
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
              ...Object.fromEntries(Array.from(response.headers.entries()))
            }
          }
        );
      }
      
      // For regular routes, redirect to login
      log(debugId, `🔄 Redirecting to login page`);
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      
      return NextResponse.redirect(redirectUrl, {
        headers: Object.fromEntries(Array.from(response.headers.entries()))
      });
    }
    
    // For protected routes that are not API routes, check if user is registered
    // This allows API routes to work even when user registration is pending
    if (isProtectedRoute && !isApiRoute && !isRegistered) {
      log(debugId, `🔒 Route requires registration but user has pending registration status: ${pathname}`);
      
      // Check if we just recently synced the user by looking at the last_synced_at timestamp
      const lastSynced = user?.app_metadata?.last_synced_at || user?.user_metadata?.last_synced_at;
      if (lastSynced) {
        const syncTime = new Date(lastSynced);
        const timeSinceSync = Date.now() - syncTime.getTime();
        
        // If synced in the last 10 minutes, consider them registered
        if (timeSinceSync < 10 * 60 * 1000) {
          log(debugId, `User was synced ${timeSinceSync / 1000}s ago, considering registered`);
          
          // Pass user info in headers for server components
          if (user) {
            response.headers.set('x-user-id', user.id);
            if (user.email) {
              response.headers.set('x-user-email', user.email);
            }
          }
          
          log(debugId, `✅ Middleware processing complete after sync check`);
          return response;
        }
      }
      
      // Try to force a refresh of the session to get the latest metadata
      try {
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData?.session?.user?.app_metadata?.is_registered === true) {
          log(debugId, `User registration status updated after refresh, considering registered`);
          
          // Pass user info in headers for server components
          if (user) {
            response.headers.set('x-user-id', user.id);
            if (user.email) {
              response.headers.set('x-user-email', user.email);
            }
          }
          
          log(debugId, `✅ Middleware processing complete after session refresh`);
          return response;
        }
      } catch (refreshError) {
        logError(debugId, 'Error refreshing session:', refreshError);
      }
      
      // Check if we've already redirected this user recently to prevent redirect loops
      if (user && redirectedUsers.has(user.id)) {
        log(debugId, `Already redirected user ${user.id} recently, allowing access to avoid loop`);
        
        // Pass user info in headers for server components
        response.headers.set('x-user-id', user.id);
        if (user.email) {
          response.headers.set('x-user-email', user.email);
        }
        
        log(debugId, `✅ Middleware processing complete to prevent redirect loop`);
        return response;
      }
      
      // Add user to redirected set to prevent future redirects for this user
      if (user) {
        redirectedUsers.add(user.id);
        log(debugId, `Added user ${user.id} to redirect prevention set`);
      }
      
      // Redirect to a route that will force sync the user
      const redirectUrl = new URL('/auth/verify-registration', request.url);
      redirectUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      redirectUrl.searchParams.set('t', Date.now().toString()); // Add timestamp to prevent caching
      
      return NextResponse.redirect(redirectUrl, {
        headers: Object.fromEntries(Array.from(response.headers.entries()))
      });
    }
    
    // If authenticated, pass user info in headers for server components
    if (user) {
      response.headers.set('x-user-id', user.id);
      if (user.email) {
        response.headers.set('x-user-email', user.email);
      }
    }
    
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