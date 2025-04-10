import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Helper to generate a debug ID for tracing requests through logs
function generateDebugId() {
  return Math.random().toString(36).substring(2, 8);
}

// Format CSP string by removing extra whitespace
function formatCSP(csp: string) {
  return csp.replace(/\s{2,}/g, ' ').trim();
}

// Generate an appropriate Content Security Policy based on environment
function generateCSP(isDev: boolean) {
  // Base domains needed for the app to function
  const baseConnectSrc = [
    "'self'",
    "https://*.supabase.co",
    "https://*.supabase.in",
    "https://api.openai.com"
  ];
  
  // Apple authentication domains
  const appleAuthDomains = [
    "https://appleid.cdn-apple.com",
    "https://appleid.apple.com",
    "https://apple.com",
    "https://signin.apple.com",
    "https://gsa.apple.com" // Additional Apple domain that might be needed in the future
  ];
  
  // Add development-specific sources if in dev mode
  if (isDev) {
    baseConnectSrc.push(
      "http://localhost:*",
      "ws://localhost:*"
    );
  }
  
  // Combine all connect sources
  const connectSrc = [...baseConnectSrc, ...appleAuthDomains].join(' ');
  
  // Build the complete CSP
  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' ${appleAuthDomains.join(' ')};
    style-src 'self' 'unsafe-inline';
    connect-src ${connectSrc};
    img-src 'self' data: blob: https:;
    font-src 'self' data:;
    frame-src ${appleAuthDomains.join(' ')};
    object-src 'none';
    base-uri 'self';
    form-action 'self' ${appleAuthDomains.join(' ')};
    upgrade-insecure-requests;
  `;
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
    
    return NextResponse.next();
  } catch (error) {
    console.error(`[${debugId}] ❌ Error in externalResourceMiddleware:`, error);
    // Don't block the request if middleware fails
    return NextResponse.next();
  }
}

// Main middleware function
export async function middleware(request: NextRequest) {
  const debugId = generateDebugId();
  
  try {
    console.log(`[${debugId}] 🔍 Processing ${request.method} ${request.nextUrl.pathname}`);
    
    // Define static asset paths to skip processing
    const staticAssetPaths = [
      '/_next/static/',
      '/_next/image/',
      '/images/',
      '/favicon.ico',
      '/robots.txt',
      '/sitemap.xml',
      '.css',
      '.js',
      '.webp',
      '.svg',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.ico'
    ];
    
    // Fast check for static assets to skip expensive processing
    const isStaticAsset = isPathMatch(request.nextUrl.pathname, staticAssetPaths);
    
    // Skip auth checks for static assets - return minimal response
    if (isStaticAsset) {
      console.log(`[${debugId}] 📦 Static asset detected, skipping auth checks`);
      const response = NextResponse.next();
      // Add basic cache headers for static assets
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return response;
    }
    
    // Create a response object to modify
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      }
    });
    
    // Public assets and static paths to skip auth checks
    const publicPaths = [
      '/images/',
      '/favicon.ico',
      '/socket.io',
      '/_next/',
      '/api/auth/',
      '/api/csrf', // Add CSRF API route
      '/login',
      '/signup', // Added signup route
      '/register',
      '/reset-password',
      '/verify-email',
      '/api/csrf/',
      '/static/',
      '/public/',
      '/about',
      '/pricing',
      '/faq',
      '/contact',
      '/api/status', // API status endpoint
      '/api/health', // Health check endpoint
      '/api/webhooks/', // Webhook endpoints
      '/api/images/', // Public image serving API
      '/api/auth-debug', // Auth debugging endpoint
      '/api/auth-test', // Auth testing endpoint
      '/', // Add root path as public
      '/forgot-password',
      '/explore',
      '/streams',
    ];
    
    // Check if the path matches any public path
    const isPublicPath = isPathMatch(request.nextUrl.pathname, publicPaths);
    
    // Set security headers
    const headers = response.headers;
    
    // Generate and set Content Security Policy - exclude for static assets
    if (!isStaticAsset) {
      const isDev = process.env.NODE_ENV !== 'production';
      headers.set('Content-Security-Policy', formatCSP(generateCSP(isDev)));
    }
    
    // Set other security headers
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
    headers.set('X-XSS-Protection', '1; mode=block');
    
    // Skip auth checks for public paths and just return the response with headers
    if (isPublicPath) {
      console.log(`[${debugId}] 🔓 Public path detected: ${request.nextUrl.pathname}`);
      
      // Add cache control for static assets 
      if (request.nextUrl.pathname.startsWith('/_next/') || request.nextUrl.pathname.includes('/images/')) {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      return response;
    }
    
    // Skip WebSocket upgrade requests
    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      console.log(`[${debugId}] 🔌 WebSocket upgrade request detected`);
      return response;
    }
    
    // Skip socket.io polling requests
    if (request.nextUrl.pathname.includes('/api/socketio') || 
        request.nextUrl.pathname.includes('/api/socket.io')) {
      console.log(`[${debugId}] 🔄 Socket.IO request detected`);
      return response;
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
    ];

    // Regular expression for routes like /streams/{id}/host
    const streamHostRegex = /^\/streams\/[^\/]+\/host$/;
    
    // Check if current path requires authentication
    const requiresAuth = 
      isPathMatch(request.nextUrl.pathname, protectedRoutes) ||
      streamHostRegex.test(request.nextUrl.pathname);
    
    // Only perform Supabase auth check if the route requires authentication
    if (requiresAuth) {
      console.log(`[${debugId}] 🔒 Protected route detected: ${request.nextUrl.pathname}`);
      
      // Create Supabase client for auth session refresh - ONLY for protected routes
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              // Set cookies on both the request and the response
              cookiesToSet.forEach(({ name, value, options }) => {
                try {
                  request.cookies.set(name, value);
                  response.cookies.set(name, value, options);
                } catch (error) {
                  console.error(`[${debugId}] 🍪 Error setting cookie ${name}:`, error);
                }
              });
            },
          },
        }
      );
      
      // IMPORTANT: Call getUser to refresh the session if needed
      // This is critical to prevent users from being logged out unexpectedly
      const { data, error } = await supabase.auth.getUser();
      const supabaseUser = data?.user;
      
      if (error) {
        console.error(`[${debugId}] ❌ Supabase error ${error.status || ''} on ${request.nextUrl.pathname}:`, error.message);
      }
      
      // Only log auth check for non-static routes and when debugging is enabled
      if ((process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUTH === 'true') && 
          !isStaticAsset && !isPublicPath) {
        console.log(`[${debugId}] 👤 Auth check:`, {
          hasUser: !!supabaseUser,
          userId: supabaseUser?.id?.substring(0, 8) + '...',
          userEmail: supabaseUser?.email?.substring(0, 3) + '***', // Partial for privacy
          path: request.nextUrl.pathname
        });
      }
      
      // Add security headers for authenticated routes
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      headers.set('Surrogate-Control', 'no-store');
      
      // Check if the user is authenticated via Supabase
      if (!supabaseUser) {
        console.log(`[${debugId}] 🚫 Authentication required but no user found, redirecting`);
        
        // In production, for API requests, return 401 instead of redirecting
        if (process.env.NODE_ENV === 'production' && request.nextUrl.pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ 
              error: 'Authentication required',
              status: 'unauthorized'
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
        
        // Redirect to login page with callback URL
        const url = new URL('/login', request.url);
        url.searchParams.set('callbackUrl', request.nextUrl.pathname);
        return NextResponse.redirect(url);
      }
      
      console.log(`[${debugId}] ✅ User authenticated for protected route`);
    }
    
    console.log(`[${debugId}] ✅ Middleware processing complete`);
    return response;
  } catch (error) {
    console.error(`[${debugId}] 🔥 Critical error in middleware:`, error);
    
    // Handle critical errors in production - don't block the request
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[${debugId}] ⚠️ Bypassing middleware due to critical error`);
      return NextResponse.next();
    }
    
    // In development, we should see the error
    return new NextResponse(
      JSON.stringify({ error: 'Middleware error', message: error.message, debugId }),
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
    // Match all paths except for specific static assets
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'
  ],
}; 