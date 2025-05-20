import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import crypto from 'crypto'

// List of protected routes (require authentication)
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/streams/create',
  '/collection',
  '/api/collection',
  '/api/spirits/',
  '/api/spirit/',
  '/api/users/',
  '/api/user/',
  '/api/upload',
  '/api/protected',
]

// List of public routes (no authentication required)
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/api/auth',
  '/api/csrf',
  '/api/status',
  '/api/image-proxy',
  '/api/csp-report',
  '/_next',
  '/static',
  '/images',
  '/favicon.ico',
]

// Patterns for static assets to skip
const staticAssetPatterns = [
  /\.(jpe?g|png|gif|webp|svg|ico)$/i,
  /\.(css|js|map)$/i,
  /^\/socket\.io\//,
  /^\/api\/socketio/
]

// Helper function to trigger background video sync occasionally
// This helps ensure videos are kept updated without requiring user interaction
async function triggerBackgroundVideoSync() {
  // Only run this on a small percentage of requests to avoid hammering the Mux API
  // Using 5% chance gives a good balance without adding too much overhead
  if (Math.random() < 0.05) {
    try {
      // Construct the URL with the background flag and a cache buster
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const syncUrl = new URL('/api/videos/sync-status', baseUrl);
      syncUrl.searchParams.set('background', 'true');
      syncUrl.searchParams.set('t', Date.now().toString()); // Cache buster
      
      // Fire and forget - we don't need to wait for the response
      // Using fetch with no-store to prevent caching
      fetch(syncUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }).catch(err => {
        // Silent fail - we don't want to block the main request 
        // if background sync fails
        console.warn('Silent background video sync failed:', err);
      });
      
      console.log('Triggered background video sync');
    } catch (error) {
      // Fail silently - this is a background task that shouldn't affect the main request
      console.warn('Failed to trigger background sync:', error);
    }
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (publicly served assets)
     * - static (another common public asset folder)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|static/|api/image-proxy).*)',
  ],
}

// Generate a cryptographically random nonce for CSP
function generateCSPNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

// Add CSP reporting directives
const cspReportingDirectives = `report-uri /api/csp-report; report-to csp-endpoint;`;

// Create Content Security Policy with nonce and strict-dynamic
function createStrictCSPHeader(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Media source directives - needed for Mux video player
  const mediaSrcDirectives = `
    media-src 'self' blob: https://*.mux.com https://mux.com https://stream.mux.com https://assets.mux.com https://image.mux.com https://*.fastly.mux.com https://*.cloudflare.mux.com https://*.litix.io;
  `;
  
  // Connection directives - needed for API endpoints and WebSockets
  const connectSrcDirectives = `
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mux.com https://mux.com https://inferred.litix.io https://*.litix.io https://stream.mux.com https://assets.mux.com https://*.mux.com https://*.fastly.mux.com https://*.cloudflare.mux.com https://storage.googleapis.com https://vercel.live https://vercel.com https://*.pusher.com wss://*.pusher.com https://vitals.vercel-insights.com https://serpapi.com https://*.serpapi.com;
  `;
  
  // Frame directives - needed for embedded content
  const frameSrcDirectives = `
    frame-src 'self' https://vercel.live https://vercel.com https://*.mux.com;
  `;
  
  // Basic security directives
  const baseDirectives = `
    default-src 'self';
    font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;
    img-src 'self' data: blob: https://*.mux.com https://image.mux.com https://mux.com https://vercel.live https://vercel.com https://*.pusher.com/ https://*.amazonaws.com https://*.supabase.co https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://serpapi.com https://*.serpapi.com https://lpwinesandliquors.com https://*.lpwinesandliquors.com https://*.distiller.com https://www.google.com;
    ${mediaSrcDirectives}
    ${connectSrcDirectives}
    ${frameSrcDirectives}
    object-src 'none';
    base-uri 'none'; 
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;
  
  // Use strict CSP with nonce and strict-dynamic
  let strictCSP = `
    ${baseDirectives}
    script-src 'nonce-${nonce}' 'strict-dynamic' https:;
    style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com;
    ${cspReportingDirectives}
  `;
  
  // In development, we might need to allow 'unsafe-eval' for HMR and possibly 'unsafe-inline' for styles if nonces are tricky
  if (isDevelopment) {
    strictCSP = `
      ${baseDirectives}
      script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https:;
      style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com;
      ${cspReportingDirectives}
    `;
  }
  
  return strictCSP.replace(/\s{2,}/g, ' ').trim();
}

// Create a more permissive CSP for special pages that need it
function createRelaxedCSPHeader(nonce: string): string {
  return `
    default-src 'self';
    script-src 'nonce-${nonce}' 'strict-dynamic' https:;
    style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com 'unsafe-inline';
    img-src 'self' data: blob: https: http:;
    font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co https://api.mux.com https://* wss://*;
    media-src 'self' blob: https://*.mux.com;
    object-src 'none';
    base-uri 'none';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
    ${cspReportingDirectives}
  `.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Next.js Middleware for SSR authentication and route protection.
 * - Adds CSP headers with nonces
 * - Handles Supabase SSR auth and route protection
 * - Occasionally triggers background video sync
 */
export async function middleware(request: NextRequest) {
  const url = new URL(request.url)
  const path = url.pathname

  // Skip static assets for performance
  const isStaticAsset = staticAssetPatterns.some(pattern => pattern.test(path))
  
  // Generate CSP nonce for this request
  const nonce = isStaticAsset ? '' : generateCSPNonce();
  
  // Create modified request headers with nonce
  const requestHeaders = new Headers(request.headers);
  if (!isStaticAsset) {
    requestHeaders.set('x-nonce', nonce);
  }
  
  // Initialize a base response. Supabase client might update this instance
  // or we might replace it if we redirect.
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Initialize Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Create a new response object only once
          cookiesToSet.forEach(({ name, value, options }) => {
            // First set cookie in the request cookies store to ensure it's available 
            // for the current request processing
            request.cookies.set(name, value)
            
            // Also set in the response for subsequent requests
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: DO NOT execute any code between creating the Supabase client
  // and calling auth.getUser() to prevent session inconsistency

  // IMPORTANT: Call supabase.auth.getUser() to handle session refresh and allow Supabase
  // to set cookies on our 'response' object via the 'setAll' handler if needed.
  const { data: { user } } = await supabase.auth.getUser()

  // Debug log authentication state
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUTH === 'true') {
    console.log(`[Auth Debug] Path: ${path}`);
    console.log(`[Auth Debug] User authenticated: ${!!user}`);
    console.log(`[Auth Debug] User ID: ${user?.id || 'none'}`);
    console.log(`[Auth Debug] Cookies: ${request.cookies.getAll().map(c => c.name).join(', ')}`);
    console.log(`[Auth Debug] Protected route match: ${protectedRoutes.some(route => path.startsWith(route))}`);
  }

  // Now that Supabase has had a chance to work with 'response', set CSP.
  // Use a more permissive CSP for the spirit detail pages
  let contentSecurityPolicy = '';
  
  if (!isStaticAsset) {
    // Special case for spirit detail pages which need more permissive image sources
    if (path.includes('/collection/spirit/')) {
      contentSecurityPolicy = createRelaxedCSPHeader(nonce);
    } else {
      // Use the strict CSP for other pages
      contentSecurityPolicy = createStrictCSPHeader(nonce);
    }
    
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
    response.headers.set('Report-To', JSON.stringify({
      group: 'csp-endpoint',
      max_age: 10886400,
      endpoints: [{ url: '/api/csp-report' }],
      include_subdomains: true
    }));
    
    // Add debug info headers that can be read by the client
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUTH === 'true') {
      response.headers.set('X-Auth-Debug-IsAuthenticated', user ? 'true' : 'false');
      response.headers.set('X-Auth-Debug-Path', path);
      response.headers.set('X-Auth-Debug-Timestamp', new Date().toISOString());
      if (user) {
        response.headers.set('X-Auth-Debug-UserId', user.id.substring(0, 8) + '...');
      }
    }
  }
  
  // Add script to page that will log debug info to console
  const debugScript = `
  <script nonce="${nonce}">
    console.log(
      "%c🔐 Auth Debug Info",
      "color: white; background-color: #4CAF50; padding: 4px 8px; border-radius: 4px; font-weight: bold;"
    );
    console.log("🔍 Path:", "${path}");
    console.log("👤 Is Authenticated:", ${!!user});
    console.log("⏱️ Server Time:", "${new Date().toISOString()}");
    ${user ? `console.log("🆔 User ID:", "${user.id}");` : ''}
    console.log("🍪 Cookie Count:", ${request.cookies.getAll().length});
    console.log(
      "%c📝 Navigation Event",
      "color: white; background-color: #2196F3; padding: 4px 8px; border-radius: 4px; font-weight: bold;",
      "Route accessed at: " + new Date().toISOString()
    );
    
    // Helper function to detect auth issues
    function checkAuthState() {
      const isCollectionPage = window.location.pathname.startsWith('/collection');
      const wasRedirected = document.referrer.includes('/login');
      
      if (isCollectionPage) {
        console.log(
          "%c🧪 Collection Page Access Check",
          "color: white; background-color: #FF9800; padding: 4px 8px; border-radius: 4px; font-weight: bold;"
        );
        console.log("📍 Current URL:", window.location.href);
        console.log("↩️ Referrer:", document.referrer || "none");
        console.log("🔄 Was Redirected:", wasRedirected);
      }
    }
    
    // Run check after page loads
    window.addEventListener('load', checkAuthState);
  </script>
  `;
  
  // Only inject the debug script if we're not dealing with a static asset, API route, or Next.js internal route
  if (!isStaticAsset && 
      !path.startsWith('/api/') && 
      !path.startsWith('/_next/') && 
      (process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUTH === 'true')) {
    
    // Read the response body
    response.headers.set('X-Auth-Debug-Active', 'true');
    
    // We'll set a header that signals our debug script should be injected
    // This will be handled by a special middleware or a layout component
    response.headers.set('X-Auth-Debug-Script', 'inject');
    response.headers.set('X-Auth-Debug-Data', JSON.stringify({
      path,
      isAuthenticated: !!user,
      timestamp: new Date().toISOString(),
      userId: user ? user.id : null,
      cookieCount: request.cookies.getAll().length
    }));
  }
  
  // Handle public routes first
  const isPublic = publicRoutes.some(route => {
    if (path === route) return true;
    // Handle cases where public route is a prefix, e.g. /auth/*
    // Ensure it doesn't incorrectly match parts of longer paths if not intended.
    // For exact prefix matching for folders:
    if (route.endsWith('/')) return path.startsWith(route);
    // For exact file matches or specific API endpoints:
    return path === route;
  });

  if (isPublic) {
    // For public routes, return the response. Supabase cookies might have been set.
    return response;
  }
  
  // 2. If not a public route, check if user is authenticated
  if (user) {
    // User is authenticated, allow access.
    // Potentially trigger background sync for relevant pages
    if (path === '/past-tastings' || path === '/dashboard' || path === '/') {
        triggerBackgroundVideoSync();
    }
    return response;
  }
  
  // 3. User is NOT authenticated, and it's NOT a public route.
  //    This means it must be a protected route or an unknown route.
  //    For simplicity here, we assume any non-public route without a user session
  //    should redirect to login. If you have non-protected, non-public routes
  //    that unauthenticated users can see, that logic would need adjustment.
  
  // Check if it's explicitly a protected route (this check is mainly for clarity now,
  // as any non-public route without a user will redirect).
  const isProtectedRoute = protectedRoutes.some(route => {
    if (path === route) return true;
    // Ensure trailing slashes are handled if `route` doesn't include them
    if (path === `${route}/`) return true; 
    // Check if path starts with a protected folder-like route
    if (route.endsWith('/') && path.startsWith(route)) return true; 
    // Check for specific API patterns if route is like /api/spirits/
    if (route.endsWith('/') && path.startsWith(route)) return true;
    return false;
  });

  // Redirect to login if not authenticated and trying to access a non-public page.
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', encodeURIComponent(path))

  const redirectResponse = NextResponse.redirect(loginUrl);

  // Copy essential cookies (like those Supabase might have tried to set before getUser)
  // and CSP headers to the redirect response.
  response.cookies.getAll().forEach(cookie => {
    redirectResponse.cookies.set(cookie.name, cookie.value, {
      domain: cookie.domain,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      maxAge: cookie.maxAge,
      path: cookie.path,
      sameSite: cookie.sameSite as "strict" | "lax" | "none" | undefined,
      secure: cookie.secure
    });
  });

  if (!isStaticAsset) {
    // Re-apply the determined CSP to the redirect response
    const finalCsp = path.includes('/collection/spirit/') ? createRelaxedCSPHeader(nonce) : createStrictCSPHeader(nonce);
    redirectResponse.headers.set('Content-Security-Policy', finalCsp);
    const reportTo = response.headers.get('Report-To');
    if (reportTo) {
      redirectResponse.headers.set('Report-To', reportTo);
    }
  }
  
  return redirectResponse;
}
