import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Helper to generate a debug ID for tracing requests through logs
function generateDebugId() {
  return Math.random().toString(36).substring(2, 8);
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

// Main middleware function
export async function middleware(request: NextRequest) {
  const debugId = generateDebugId();
  
  try {
    console.log(`[${debugId}] 🔍 Processing ${request.method} ${request.nextUrl.pathname}`);
    
    // Check for HTTP to HTTPS upgrade
    const resourceRedirect = externalResourceMiddleware(request);
    if (resourceRedirect) return resourceRedirect;
    
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
      '/api/reporting', // CSP reporting endpoint
    ];
    
    // Check if the path matches any public path
    const isPublicPath = isPathMatch(request.nextUrl.pathname, publicPaths);
    
    // Skip auth checks for public paths and just return the response with headers
    if (isPublicPath) {
      console.log(`[${debugId}] 🔓 Public path detected: ${request.nextUrl.pathname}`);
      
      // Add cache control for static assets 
      if (request.nextUrl.pathname.startsWith('/_next/') || request.nextUrl.pathname.includes('/images/')) {
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
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
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      response.headers.set('Surrogate-Control', 'no-store');
      
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
                ...Object.fromEntries(response.headers)
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
    
    // security headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('X-DNS-Prefetch-Control', 'on');
    responseHeaders.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    responseHeaders.set('X-XSS-Protection', '1; mode=block');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Frame-Options', 'SAMEORIGIN');
    responseHeaders.set('Referrer-Policy', 'origin-when-cross-origin');
    
    // Add Permissions-Policy header (replacing deprecated Feature-Policy)
    responseHeaders.set('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
    
    // Content Security Policy based on environment
    if (process.env.NODE_ENV === 'production') {
      // Strict CSP for production
      responseHeaders.set(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net https://cdn.paddle.com https://apis.google.com https://plausible.io; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: blob: https://*.supabase.co https://res.cloudinary.com https://source.unsplash.com https://images.unsplash.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://checkout.paddle.com; " +
        "frame-src 'self' https://js.stripe.com https://checkout.paddle.com; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'self'; " +
        "block-all-mixed-content; " +
        "upgrade-insecure-requests"
      );
    } else {
      // More permissive CSP for development
      responseHeaders.set(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: blob: https://*.supabase.co https://res.cloudinary.com https://source.unsplash.com https://images.unsplash.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "connect-src 'self' localhost:* 127.0.0.1:* ws://localhost:* wss://localhost:* https://*.supabase.co wss://*.supabase.co; " +
        "frame-src 'self' https://js.stripe.com; " +
        "object-src 'none'; " +
        "base-uri 'self'"
      );
    }
    
    // Apply the updated headers to the response
    Object.entries(responseHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
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