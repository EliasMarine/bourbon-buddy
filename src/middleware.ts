import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { createServerClient } from '@supabase/ssr';
import { createSupabaseServerClientFromRequest } from '@/lib/supabase';

// Handle HTTP to HTTPS upgrade for external resources
function externalResourceMiddleware(req: NextRequest) {
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
}

// Main middleware without auth
export async function middleware(req: NextRequest) {
  try {
    // Set security headers
    let response = NextResponse.next({
      request: {
        // Clone request headers to make sure they're preserved
        headers: new Headers(req.headers)
      }
    });
    
    // Add security headers
    const headers = response.headers;
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
    
    // Update Content Security Policy to allow more image sources
    headers.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https: http:; " + // Allow both HTTP and HTTPS images 
      "font-src 'self' data:; " +
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.openai.com https://bourbonbuddy.live"
    );

    // Force HTTPS in production
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = req.nextUrl.protocol === 'https:';
    
    // In production, redirect to HTTPS if request is HTTP
    if (isProduction && !isSecure && !req.nextUrl.pathname.startsWith('/_next/static/')) {
      const newUrl = req.nextUrl.clone();
      newUrl.protocol = 'https:';
      newUrl.host = req.headers.get('host') || req.nextUrl.host;
      return NextResponse.redirect(newUrl);
    }

    // Create Supabase client for authentication token handling - using our utility
    const supabase = createSupabaseServerClientFromRequest(req, response);

    // IMPORTANT: After auth state is initialized, get the user to refresh tokens if needed
    // Note: We need to await this to ensure tokens are refreshed before proceeding
    const maybeProtectedRoute = 
      req.nextUrl.pathname.startsWith('/dashboard') ||
      req.nextUrl.pathname.startsWith('/profile') ||
      req.nextUrl.pathname.startsWith('/streams/create') ||
      req.nextUrl.pathname.match(/^\/streams\/[^\/]+\/host$/) ||
      req.nextUrl.pathname.startsWith('/collection') ||
      req.nextUrl.pathname.startsWith('/api/') && 
      !req.nextUrl.pathname.startsWith('/api/auth/') &&
      !req.nextUrl.pathname.startsWith('/api/status') &&
      !req.nextUrl.pathname.startsWith('/api/csrf');
    
    if (maybeProtectedRoute && supabase) {
      try {
        // This automatically refreshes the session if needed
        await supabase.auth.getUser();
      } catch (err) {
        console.error('Error in Supabase auth middleware:', err);
      }
    }

    // Set a standard CSRF token cookie without prefixes
    if (!req.nextUrl.pathname.startsWith('/api/') && req.method === 'GET') {
      const csrfCookieName = 'csrf_secret';
      const hasCsrfToken = req.cookies.has(csrfCookieName);
      
      if (!hasCsrfToken) {
        // Generate new CSRF token
        const csrfToken = nanoid(32);
        const csrfTokenValue = `${csrfToken}|${Date.now()}`;
        
        // Set cookie with proper parameters
        response.cookies.set(csrfCookieName, csrfTokenValue, {
          httpOnly: true,
          secure: isProduction, // Only set secure in production
          sameSite: 'lax',
          path: '/'
        });
      }
    }
    
    // Apply protocol upgrade for HTTP requests
    if (req.nextUrl.href.startsWith('http:') && req.headers.get('x-forwarded-proto') !== 'http') {
      const newUrl = req.nextUrl.clone();
      newUrl.protocol = 'https:';
      return NextResponse.redirect(newUrl);
    }
    
    // Check if the path is for an image or static asset
    if (
      req.nextUrl.pathname.includes('/images/') || 
      req.nextUrl.pathname.includes('/favicon.ico') ||
      req.nextUrl.pathname.includes('/socket.io') ||
      req.nextUrl.pathname.startsWith('/_next/') ||
      req.nextUrl.pathname.endsWith('.jpg') ||
      req.nextUrl.pathname.endsWith('.jpeg') ||
      req.nextUrl.pathname.endsWith('.png') ||
      req.nextUrl.pathname.endsWith('.gif') ||
      req.nextUrl.pathname.endsWith('.webp') ||
      req.nextUrl.pathname.startsWith('/api/csrf') // Allow CSRF token endpoint to be accessible
    ) {
      // Skip auth check for images, public assets, and CSRF endpoint
      return response;
    }
    
    // Skip WebSocket upgrade requests
    if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      return response;
    }
    
    // Skip socket.io polling requests
    if (req.nextUrl.pathname.includes('/api/socketio') || 
        req.nextUrl.pathname.includes('/api/socket.io')) {
      return response;
    }
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      headers.set('Access-Control-Allow-Origin', req.headers.get('origin') || '*');
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
      headers.set('Access-Control-Max-Age', '86400'); // 24 hours
      return response;
    }
    
    // For protected routes, apply auth check
    if (maybeProtectedRoute) {
      // Add cache control headers for protected routes
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      
      // Check if the user is authenticated
      const authHeader = req.headers.get('authorization');
      const sessionCookieName = 'next-auth.session-token';
      const sessionCookie = req.cookies.get(sessionCookieName)?.value;
      
      // If we're in production and using __Secure- prefix, make sure we're on HTTPS
      // as required by the prefix
      if (isProduction && !isSecure && req.headers.get('x-forwarded-proto') !== 'https') {
        const newUrl = req.nextUrl.clone();
        newUrl.protocol = 'https:';
        newUrl.host = req.headers.get('host') || req.nextUrl.host;
        return NextResponse.redirect(newUrl);
      }
      
      if (!authHeader && !sessionCookie) {
        // Return JSON error for API routes
        if (req.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Unauthorized - Not authenticated' },
            { status: 401 }
          );
        }
        
        // Redirect to login page for non-API routes
        const url = new URL('/login', req.url);
        url.searchParams.set('callbackUrl', req.nextUrl.pathname);
        return NextResponse.redirect(url);
      }
      
      // For API routes, make sure to preserve the cookies
      if (req.nextUrl.pathname.startsWith('/api/')) {
        // Clone cookies and add them to the new response
        // Use getAll() for NextRequest cookies
        const cookieList = req.cookies.getAll();
        for (const cookie of cookieList) {
          response.cookies.set(cookie.name, cookie.value);
        }
      }
    }
    
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // Return basic response on error to avoid crashing
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Match all paths
    '/(.*)',
  ],
}; 