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
  
  // Add security headers
  const headers = response.headers;
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.openai.com");
  
  // Check if the path is for an image
  if (
    req.nextUrl.pathname.includes('/images/') || 
    req.nextUrl.pathname.includes('/favicon.ico') ||
    req.nextUrl.pathname.includes('/socket.io') ||
    req.nextUrl.pathname.startsWith('/_next/')
  ) {
    // Skip auth check for images and public assets
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
  
  // For protected routes, apply auth check
  if (
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/profile') ||
    req.nextUrl.pathname.startsWith('/streams/create') ||
    req.nextUrl.pathname.match(/^\/streams\/[^\/]+\/host$/) ||
    req.nextUrl.pathname.startsWith('/collection')
  ) {
    // Add cache control headers for protected routes
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    
    // Check if the user is authenticated
    const authHeader = req.headers.get('authorization');
    const cookie = req.cookies.get('next-auth.session-token')?.value || 
                   req.cookies.get('__Secure-next-auth.session-token')?.value;
    
    if (!authHeader && !cookie) {
      // Redirect to login page
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