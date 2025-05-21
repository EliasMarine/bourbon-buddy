import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import crypto from 'crypto'

// Import NextRequest as a value, not just a type
import { NextRequest as ActualNextRequest } from 'next/server'

// List of protected routes (require authentication)
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/streams/create',
  '/collection', // Collection path without trailing slash
  '/collection/', // Collection path with trailing slash - explicitly added to fix routing issue
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
  
  // Well-known hashes for React and other frameworks' runtime-generated inline styles
  // These hashes were extracted from CSP violation reports
  const knownStyleHashes = [
    "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
    "'sha256-7lAG9nNPimWNBky6j9qnn0jfFzu5wK96KOj/UzoG0hg='",
    "'sha256-LL1Oj3pIToBpzHWMlAyrmK9guWSsY8Nr8wq7gA/m/ew='",
    "'sha256-8mIk1oX3LmRB+UWuFGvbo1hLWczGs3Z5yXDPHotWXlQ='",
    "'sha256-ZYns29och5nBGFV2O2mG0POX+mI2q4UFtJuvS1eoGF0='",
    "'sha256-DSYmRr35z6zyfy04z49VxSw/Fjw5T+rlVRbZWRT8U/I='",
    "'sha256-OYG2xTYpFINTWWpa7AYS4DfPiIyxrHaKeuWu5xqQjPE='",
    "'sha256-nzTgYzXYDNe6BAHiiI7NNlfK8n/auuOAhh2t92YvuXo='",
    "'sha256-Nqnn8clbgv+5l0PgxcTOldg8mkMKrFn4TvPL+rYUUGg='",
    "'sha256-13vrThxdyT64GcXoTNGVoRRoL0a7EGBmOJ+lemEWyws='",
    "'sha256-QZ52fjvWgIOIOPr+gRIJZ7KjzNeTBm50Z+z9dH4N1/8='",
    "'sha256-yOU6eaJ75xfag0gVFUvld5ipLRGUy94G17B1uL683EU='",
    "'sha256-OpTmykz0m3o5HoX53cykwPhUeU4OECxHQlKXpB0QJPQ='",
    "'sha256-SSIM0kI/u45y4gqkri9aH+la6wn2R+xtcBj3Lzh7qQo='",
    "'sha256-ZH/+PJIjvP1BctwYxclIuiMu1wItb0aasjpXYXOmU0Y='",
    "'sha256-58jqDtherY9NOM+ziRgSqQY0078tAZ+qtTBjMgbM9po='",
    "'sha256-7Ri/I+PfhgtpcL7hT4A0VJKI6g3pK0ZvIN09RQV4ZhI='",
    "'sha256-+1ELCr8ReJfJBjWJ10MIbLJZRYsIfwdKV+UKdFVDXyo='",
    "'sha256-MktN23nRzohmT1JNxPQ0B9CzVW6psOCbvJ20j9YxAxA='",
    "'sha256-47lXINn3kn6TjA9CnVQoLLxD4bevVlCtoMcDr8kZ1kc='",
    "'sha256-wkAU1AW/h8RKmZ3BUsffwzbTWBeIGD83S5VR9RhiQtk='",
    "'sha256-MQsH+WZ41cJWVrTw3AC5wJ8LdiYKgwTlENhYI5UKpow='",
    "'sha256-TIidHKBLbE0MY7TLE+9G8QOzGXaS7aIwJ1xJRtTd3zk='",
    "'sha256-zlqnbDt84zf1iSefLU/ImC54isoprH/MRiVZGskwexk='",
    "'sha256-YU+7xR2SQ2IoeUaPeEWvwLEWsztKCB9S84+vZSiCCb8='",
    "'sha256-e+d//0i8BFXT2i7IyorNZ0tv2tapkHWj1efiS4sgAWo='",
    "'sha256-idlVAVXQtMoxiIyJdtG5SRyKpGisdxifn7tQeFGuGFU='"
  ].join(' ');
  
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
  
  // For production, use nonce + hashes + strict-dynamic for defense-in-depth
  let strictCSP = `
    ${baseDirectives}
    script-src 'nonce-${nonce}' 'strict-dynamic' https:;
    style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com 'unsafe-hashes' ${knownStyleHashes};
    ${cspReportingDirectives}
  `;
  
  // In development, allow safer debugging capabilities
  if (isDevelopment) {
    strictCSP = `
      ${baseDirectives}
      script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https:;
      style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com 'unsafe-hashes' ${knownStyleHashes};
      ${cspReportingDirectives}
    `;
  }
  
  return strictCSP.replace(/\s{2,}/g, ' ').trim();
}

// Create a more permissive CSP for special pages that need it
function createRelaxedCSPHeader(nonce: string): string {
  // Well-known hashes for React and other frameworks' runtime-generated inline styles
  const knownStyleHashes = [
    "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
    "'sha256-7lAG9nNPimWNBky6j9qnn0jfFzu5wK96KOj/UzoG0hg='",
    "'sha256-LL1Oj3pIToBpzHWMlAyrmK9guWSsY8Nr8wq7gA/m/ew='",
    "'sha256-8mIk1oX3LmRB+UWuFGvbo1hLWczGs3Z5yXDPHotWXlQ='",
    "'sha256-ZYns29och5nBGFV2O2mG0POX+mI2q4UFtJuvS1eoGF0='",
    "'sha256-DSYmRr35z6zyfy04z49VxSw/Fjw5T+rlVRbZWRT8U/I='",
    "'sha256-OYG2xTYpFINTWWpa7AYS4DfPiIyxrHaKeuWu5xqQjPE='",
    "'sha256-nzTgYzXYDNe6BAHiiI7NNlfK8n/auuOAhh2t92YvuXo='",
    "'sha256-Nqnn8clbgv+5l0PgxcTOldg8mkMKrFn4TvPL+rYUUGg='",
    "'sha256-13vrThxdyT64GcXoTNGVoRRoL0a7EGBmOJ+lemEWyws='",
    "'sha256-QZ52fjvWgIOIOPr+gRIJZ7KjzNeTBm50Z+z9dH4N1/8='",
    "'sha256-yOU6eaJ75xfag0gVFUvld5ipLRGUy94G17B1uL683EU='",
    "'sha256-OpTmykz0m3o5HoX53cykwPhUeU4OECxHQlKXpB0QJPQ='",
    "'sha256-SSIM0kI/u45y4gqkri9aH+la6wn2R+xtcBj3Lzh7qQo='",
    "'sha256-ZH/+PJIjvP1BctwYxclIuiMu1wItb0aasjpXYXOmU0Y='",
    "'sha256-58jqDtherY9NOM+ziRgSqQY0078tAZ+qtTBjMgbM9po='",
    "'sha256-7Ri/I+PfhgtpcL7hT4A0VJKI6g3pK0ZvIN09RQV4ZhI='",
    "'sha256-+1ELCr8ReJfJBjWJ10MIbLJZRYsIfwdKV+UKdFVDXyo='",
    "'sha256-MktN23nRzohmT1JNxPQ0B9CzVW6psOCbvJ20j9YxAxA='",
    "'sha256-47lXINn3kn6TjA9CnVQoLLxD4bevVlCtoMcDr8kZ1kc='",
    "'sha256-wkAU1AW/h8RKmZ3BUsffwzbTWBeIGD83S5VR9RhiQtk='",
    "'sha256-MQsH+WZ41cJWVrTw3AC5wJ8LdiYKgwTlENhYI5UKpow='",
    "'sha256-TIidHKBLbE0MY7TLE+9G8QOzGXaS7aIwJ1xJRtTd3zk='",
    "'sha256-zlqnbDt84zf1iSefLU/ImC54isoprH/MRiVZGskwexk='",
    "'sha256-YU+7xR2SQ2IoeUaPeEWvwLEWsztKCB9S84+vZSiCCb8='",
    "'sha256-e+d//0i8BFXT2i7IyorNZ0tv2tapkHWj1efiS4sgAWo='",
    "'sha256-idlVAVXQtMoxiIyJdtG5SRyKpGisdxifn7tQeFGuGFU='"
  ].join(' ');

  return `
    default-src 'self';
    script-src 'nonce-${nonce}' 'strict-dynamic' https:;
    style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com 'unsafe-hashes' ${knownStyleHashes};
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
export async function middleware(request: ActualNextRequest) {
  const url = new URL(request.url)
  const path = url.pathname
  const isCollectionPath = path === '/collection' || path.startsWith('/collection/');
  
  // Debug collection path access attempts
  if (isCollectionPath) {
    console.log(`[AUTH DEBUG] Collection path access attempt: ${path}`);
    console.log(`[AUTH DEBUG] Cookies: ${request.cookies.getAll().length}`);
    console.log(`[AUTH DEBUG] Cookie names: ${request.cookies.getAll().map(c => c.name).join(', ')}`);
  }

  // Skip static assets for performance
  const isStaticAsset = staticAssetPatterns.some(pattern => pattern.test(path))
  
  // Generate CSP nonce for this request
  const nonce = isStaticAsset ? '' : generateCSPNonce();
  
  // Create modified request headers with nonce
  const requestHeaders = new Headers(request.headers);
  if (!isStaticAsset) {
    requestHeaders.set('x-nonce', nonce);
  }
  
  // Ensure we have the referrer to help debug navigation issues
  const referrer = request.headers.get('referer') || 'none';
  
  // Get auth state from cookies before creating supabase client
  // This helps diagnose issues with incomplete auth state
  const hasAuthCookie = !!request.cookies.get('sb-access-token') || 
                        !!request.cookies.get('supabase-auth-token') ||
                        request.cookies.getAll().some(c => c.name.startsWith('sb-'));
  
  // Initialize a base response. Supabase client might update this instance
  // or we might replace it if we redirect.
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Track if we've already attempted session refresh to avoid loops
  const hasAttemptedRefresh = request.headers.get('x-auth-refresh-attempted') === 'true';
  
  // Add tracking header for refresh attempts to the response
  response.headers.set('x-auth-refresh-attempted', hasAttemptedRefresh ? 'true' : 'false');
  
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
          // First set cookie in the request cookies store to ensure it's available 
          // for the current request processing
          cookiesToSet.forEach(({ name, value, options }) => {
            // Add to original request cookies for current processing
            request.cookies.set(name, value);
            
            // Also set in the response for subsequent requests
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  )

  // IMPORTANT: DO NOT execute any code between creating the Supabase client
  // and calling auth.getUser() to prevent session inconsistency

  // Before checking if the user exists, actively attempt to refresh the session
  // This is particularly important for collection navigation where auth might not be fully established
  let sessionResult;
  
  // We make extra sure we have the latest session for collection paths, particularly if we suspect auth issues
  if (isCollectionPath && hasAuthCookie && !hasAttemptedRefresh) {
    try {
      console.log('[Auth Debug] 🔄 Attempting to refresh session for collection path');
      
      // Attempt an explicit session refresh to ensure we have the latest auth state
      sessionResult = await supabase.auth.getSession();
      
      // Log the session refresh attempt to help troubleshooting
      console.log(`[Auth Debug] 📋 Session refresh result: ${sessionResult?.data?.session ? "Has session" : "No session"}`);
    } catch (error) {
      console.error('[Auth Debug] ❌ Error refreshing session:', error);
    }
  }
  
  // Now get the user - we use the explicitly refreshed session result if available, otherwise default to getUser()
  const { data: { user } } = sessionResult?.data?.session ? 
    { data: { user: sessionResult.data.session.user } } : 
    await supabase.auth.getUser();

  // Enhanced debug logging for collection path authentication issues
  if (isCollectionPath) {
    console.log(`[AUTH DEBUG] Collection path: ${path}, User authenticated: ${!!user}`);
    console.log(`[AUTH DEBUG] Referrer: ${referrer}`);
    if (user) {
      console.log(`[AUTH DEBUG] User ID for collection access: ${user.id}`);
    } else {
      console.log(`[AUTH DEBUG] No user found for collection access`);
      // Check specific auth cookies to help diagnose issue
      const supabaseCookies = request.cookies.getAll().filter(c => 
        c.name.includes('supabase') || 
        c.name.includes('auth') || 
        c.name.includes('sb-')
      );
      console.log(`[AUTH DEBUG] Auth-related cookies: ${supabaseCookies.map(c => c.name).join(', ')}`);
    }
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
      response.headers.set('X-Auth-Debug-HasAuthCookie', hasAuthCookie ? 'true' : 'false');
      response.headers.set('X-Auth-Debug-Referrer', referrer);
      if (user) {
        response.headers.set('X-Auth-Debug-UserId', user.id.substring(0, 8) + '...');
      }
    }
  }
  
  // DEBUG: Output current cookies for troubleshooting session issues
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUTH === 'true') {
    console.log(`[Auth Debug] Path: ${path}`);
    console.log(`[Auth Debug] User authenticated: ${!!user}`);
    console.log(`[Auth Debug] User ID: ${user?.id || 'none'}`);
    console.log(`[Auth Debug] Cookies count: ${request.cookies.getAll().length}`);
    console.log(`[Auth Debug] Cookie names: ${request.cookies.getAll().map(c => c.name).join(', ')}`);
    console.log(`[Auth Debug] Protected route match: ${protectedRoutes.some(route => isProtectedRoute(path, route))}`);
  }
  
  // Handle public routes first - these are always allowed regardless of auth state
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
    // Add debug headers for authenticated requests
    if (!isStaticAsset && (process.env.NODE_ENV !== 'production' || process.env.DEBUG_AUTH === 'true')) {
      response.headers.set('X-Auth-Debug-Authenticated', 'true');
      response.headers.set('X-Auth-Debug-UserId', user.id);
      response.headers.set('X-Auth-Debug-Path', path);
      response.headers.set('X-Auth-Debug-RouteCheck', 'passed');
      
      // Log authenticated access for easier debugging
      console.log(`[Auth Debug] ✅ Authenticated user ${user.id.substring(0, 8)}... accessing ${path}`);
      console.log(`[Auth Debug] 🔑 Auth cookies count: ${request.cookies.getAll().length}`);
    }
    
    // Potentially trigger background sync for relevant pages
    if (path === '/past-tastings' || path === '/dashboard' || path === '/') {
        triggerBackgroundVideoSync();
    }
    
    // CRITICAL: Check for cookie inconsistencies that might lead to collection redirection
    if (isCollectionPath) {
      // Ensure all necessary session cookies are properly set
      const sessionCookies = request.cookies.getAll().filter(c => 
        c.name.includes('sb-') || 
        c.name.includes('supabase.auth')
      );
      
      if (sessionCookies.length < 2) {
        console.warn(`[Auth Debug] ⚠️ Potential cookie issue for collection path: ${sessionCookies.length} session cookies found`);
      }
      
      console.log(`[Auth Debug] 📝 Collection access granted for user ${user.id.substring(0, 8)}...`);
    }
    
    return response;
  }
  
  // 3. User is NOT authenticated, and it's NOT a public route.
  //    Check if it's explicitly a protected route
  const isProtected = protectedRoutes.some(route => isProtectedRoute(path, route));
  
  // Special handling for collection paths with auth cookies but no user yet
  // This can happen during initial navigation before auth is fully established
  if (isCollectionPath && hasAuthCookie && !hasAttemptedRefresh) {
    // We have auth cookies but no user - this might be a timing issue
    // Let's force a refresh and retry the middleware with a special header
    console.log('[Auth Debug] ⚠️ Collection access with auth cookies but no user - forcing refresh');
    
    // Create a new request with a special header indicating we've attempted refresh
    const refreshRequest = new ActualNextRequest(request.url, {
      headers: new Headers(request.headers),
      method: request.method,
      body: request.body,
      redirect: request.redirect,
      signal: request.signal,
    });
    refreshRequest.headers.set('x-auth-refresh-attempted', 'true');
    
    // Copy all cookies to ensure state is preserved
    request.cookies.getAll().forEach(cookie => {
      // Just set name and value without extra options to avoid type errors
      refreshRequest.cookies.set(cookie.name, cookie.value);
    });
    
    // Rerun the middleware with the refreshed request
    return middleware(refreshRequest);
  }
  
  // If it's a protected route, redirect to login
  if (isProtected) {
    // Redirect to login if not authenticated and trying to access a protected page
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', encodeURIComponent(path))
    
    const redirectResponse = NextResponse.redirect(loginUrl);
    
    // Copy cookies from the original request to the redirect response
    // Just copy the name and value as RequestCookie doesn't have the other properties
    request.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    
    // Copy ALL cookies from the response to the redirect response to maintain auth state
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
      
      // Add debug headers to redirect
      redirectResponse.headers.set('X-Auth-Debug-Redirect', 'true');
      redirectResponse.headers.set('X-Auth-Debug-From', path);
      redirectResponse.headers.set('X-Auth-Debug-To', loginUrl.toString());
      redirectResponse.headers.set('X-Auth-Debug-HasUser', user ? 'true' : 'false');
      redirectResponse.headers.set('X-Auth-Debug-HasAuthCookie', hasAuthCookie ? 'true' : 'false');
      redirectResponse.headers.set('X-Auth-Debug-CookieCount', request.cookies.getAll().length.toString());
    }
    
    // For collection path specifically, log detailed debug info
    if (isCollectionPath) {
      console.log(`[Auth Debug] 🔄 Redirecting unauthenticated collection request to login`);
      console.log(`[Auth Debug] 🍪 Cookies preserved in redirect: ${redirectResponse.cookies.getAll().length}`);
    }
    
    return redirectResponse;
  }
  
  // If we get here, route is neither public nor protected, return normal response
  return response;
}

// Helper function to check if a path matches a protected route
function isProtectedRoute(path: string, route: string): boolean {
  // Exact match
  if (path === route) return true;
  
  // Handle trailing slashes
  if (path === `${route}/` || `${path}/` === route) return true;
  
  // Path prefix match (for path-based routes like /collection/*)
  if (route.endsWith('/') && path.startsWith(route)) return true;
  
  // Additional specific path match for '/collection' to catch all variations
  if (route === '/collection' && (path === '/collection' || path.startsWith('/collection/'))) return true;
  
  return false;
}
