import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
export function middleware(req: NextRequest) {
  // Skip for root path - allow visiting homepage without redirect
  if (req.nextUrl.pathname === '/') {
    return NextResponse.next();
  }
  
  // Set security headers
  const response = NextResponse.next();
  
  // Add comprehensive security headers
  const headers = response.headers;
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
  
  // More restrictive and safer CSP policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Consider removing unsafe-* for increased security
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:", 
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.openai.com",
    "frame-ancestors 'none'", // Prevent your site from being framed
    "base-uri 'self'", // Restrict base URIs
    "form-action 'self'", // Restrict form targets
    "upgrade-insecure-requests", // Upgrade HTTP to HTTPS
    "block-all-mixed-content" // Block mixed content
  ];
  
  headers.set('Content-Security-Policy', cspDirectives.join('; '));
  
  // Add XSS Protection header for older browsers
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // Public assets and static paths to skip auth checks
  const publicPaths = [
    '/images/',
    '/favicon.ico',
    '/socket.io',
    '/_next/',
    '/api/auth/',
    '/login',
    '/register',
    '/reset-password',
    '/verify-email',
    '/api/csrf/',
    '/static/',
    '/public/'
  ];
  
  // Check if the path matches any public path
  if (publicPaths.some(path => req.nextUrl.pathname.includes(path))) {
    // Add cache control for static assets 
    if (req.nextUrl.pathname.startsWith('/_next/') || req.nextUrl.pathname.includes('/images/')) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    return response;
  }
  
  // Skip WebSocket upgrade requests
  if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    console.log('WebSocket upgrade request detected');
    return response;
  }
  
  // Skip socket.io polling requests
  if (req.nextUrl.pathname.includes('/api/socketio') || 
      req.nextUrl.pathname.includes('/api/socket.io')) {
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
    '/api/spirits',
    '/api/user',
    '/api/upload',
    '/api/protected'
  ];

  // Regular expression for routes like /streams/{id}/host
  const streamHostRegex = /^\/streams\/[^\/]+\/host$/;
  
  // Check if current path requires authentication
  const requiresAuth = 
    protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route)) ||
    streamHostRegex.test(req.nextUrl.pathname);
  
  if (requiresAuth) {
    // Add security headers for authenticated routes
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    headers.set('Surrogate-Control', 'no-store');
    
    // Check if the user is authenticated
    const authHeader = req.headers.get('authorization');
    const cookie = req.cookies.get('next-auth.session-token')?.value || 
                   req.cookies.get('__Secure-next-auth.session-token')?.value;
    
    if (!authHeader && !cookie) {
      // Redirect to login page with callback URL
      const url = new URL('/login', req.url);
      url.searchParams.set('callbackUrl', req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    // Match all paths
    '/(.*)',
  ],
}; 