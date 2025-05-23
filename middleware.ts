import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Handle HTTP to HTTPS upgrade for external resources
function externalResourceMiddleware(req: NextRequest) {
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
        return NextResponse.redirect(url);
      }
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Error in externalResourceMiddleware:', error);
    // Don't block the request if middleware fails
    return NextResponse.next();
  }
}

// Main middleware function
export async function middleware(request: NextRequest) {
  try {
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
    const isStaticAsset = staticAssetPaths.some(path => 
      request.nextUrl.pathname.includes(path) ||
      request.nextUrl.pathname.endsWith(path)
    );
    
    // Skip auth checks for static assets - return minimal response
    if (isStaticAsset) {
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
    
    // Create Supabase client for auth session refresh
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
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    
    // IMPORTANT: Call getUser to refresh the session if needed
    // This is critical to prevent users from being logged out unexpectedly
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    
    // Skip for root path - allow visiting homepage without redirect
    if (request.nextUrl.pathname === '/') {
      return response;
    }
    
    // Set security headers
    const headers = response.headers;
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
    
    // Add XSS Protection header for older browsers
    headers.set('X-XSS-Protection', '1; mode=block');
    
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
    ];
    
    // Check if the path matches any public path
    if (publicPaths.some(path => request.nextUrl.pathname.includes(path))) {
      // Add cache control for static assets 
      if (request.nextUrl.pathname.startsWith('/_next/') || request.nextUrl.pathname.includes('/images/')) {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      return response;
    }
    
    // Skip WebSocket upgrade requests
    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      console.log('WebSocket upgrade request detected');
      return response;
    }
    
    // Skip socket.io polling requests
    if (request.nextUrl.pathname.includes('/api/socketio') || 
        request.nextUrl.pathname.includes('/api/socket.io')) {
      console.log('Socket.IO request detected');
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
      protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route)) ||
      streamHostRegex.test(request.nextUrl.pathname);
    
    // Only log auth check for non-static routes and when debugging is enabled
    if ((process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUTH === 'true') && 
        !isStaticAsset && !publicPaths.some(path => request.nextUrl.pathname.includes(path))) {
      console.log('Auth check in middleware:', {
        hasUser: !!supabaseUser,
        userId: supabaseUser?.id?.substring(0, 8) + '...',
        userEmail: supabaseUser?.email?.substring(0, 3) + '***' // Partial for privacy
      });
    }
    
    if (requiresAuth) {
      // Add security headers for authenticated routes
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      headers.set('Surrogate-Control', 'no-store');
      
      // Check if the user is authenticated via Supabase
      if (!supabaseUser) {
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
    }
    
    return response;
  } catch (error) {
    console.error('Critical error in middleware:', error);
    
    // Handle critical errors in production - don't block the request
    if (process.env.NODE_ENV === 'production') {
      console.warn('Bypassing middleware due to critical error');
      return NextResponse.next();
    }
    
    // In development, we should see the error
    return new NextResponse(
      JSON.stringify({ error: 'Middleware error', message: error.message }),
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