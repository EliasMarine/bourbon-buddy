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
  
  // Check for protected route first - this helps us optimize session refresh logic
  const isProtected = protectedRoutes.some(route => isProtectedRoute(path, route));
  
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
  
  // Check if this is a refresh attempt to prevent loops
  const hasAttemptedRefresh = request.headers.get('x-auth-refresh-attempted') === 'true';
  const refreshCount = parseInt(request.headers.get('x-auth-refresh-count') || '0', 10);
  
  // Add tracking headers for debugging
  response.headers.set('x-auth-refresh-attempted', hasAttemptedRefresh ? 'true' : 'false');
  response.headers.set('x-auth-refresh-count', refreshCount.toString());
  response.headers.set('x-auth-has-cookies', hasAuthCookie ? 'true' : 'false');
  
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
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set cookie in both the request cookies (for current processing)
            // and the response cookies (for subsequent requests)
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  )

  // IMPORTANT: DO NOT execute any code between creating the Supabase client
  // and calling auth.getUser() or getSession() to prevent session inconsistency
  
  // Force session refresh for ALL protected route accesses when we have auth cookies
  // This is critical to maintain consistent auth state during navigation
  let sessionResult;
  let user;

  // If this is a protected route with auth cookies but we haven't tried a forced refresh yet
  if (isProtected && hasAuthCookie && refreshCount < 2) {
    try {
      console.log(`[Auth Debug] 🔄 Forcing session refresh for protected route: ${path}`);
      
      // Explicitly refresh session to ensure latest auth state
      sessionResult = await supabase.auth.getSession();
      user = sessionResult?.data?.session?.user;
      
      if (user) {
        console.log(`[Auth Debug] ✅ Session refresh successful, user: ${user.id.substring(0, 8)}...`);
      } else {
        console.log(`[Auth Debug] ❓ Session refresh completed but no user found`);
        
        // If we have auth cookies but couldn't get a user, and haven't maxed out refresh attempts,
        // try again with an incremented refresh count
        if (hasAuthCookie && refreshCount < 1) {
          console.log(`[Auth Debug] 🔄 Attempting additional refresh (${refreshCount + 1})`);
          
          // Create request for another refresh attempt
          const refreshRequest = new ActualNextRequest(request.url, {
            headers: new Headers(request.headers),
            method: request.method,
            body: request.body,
            redirect: request.redirect,
            signal: request.signal,
          });
          
          // Set refresh attempt headers
          refreshRequest.headers.set('x-auth-refresh-attempted', 'true');
          refreshRequest.headers.set('x-auth-refresh-count', (refreshCount + 1).toString());
          
          // Copy all cookies to ensure state is preserved
          request.cookies.getAll().forEach(cookie => {
            refreshRequest.cookies.set(cookie.name, cookie.value);
          });
          
          // Rerun the middleware with the refreshed request
          return middleware(refreshRequest);
        }
      }
    } catch (error) {
      console.error('[Auth Debug] ❌ Error during forced session refresh:', error);
    }
  } else {
    // Standard user fetch if not doing a forced refresh
    const userResult = await supabase.auth.getUser();
    user = userResult.data.user;
  }
  
  // Handle public routes first - these are always allowed regardless of auth state
  const isPublic = publicRoutes.some(route => {
    if (path === route) return true;
    // Handle cases where public route is a prefix, e.g. /auth/*
    if (route.endsWith('/')) return path.startsWith(route);
    return path === route;
  });

  if (isPublic) {
    // For public routes, return the response. Supabase cookies might have been set.
    if (!isStaticAsset) {
      // Set CSP headers
      response.headers.set('Content-Security-Policy', createStrictCSPHeader(nonce));
      response.headers.set('Report-To', JSON.stringify({
        group: 'csp-endpoint',
        max_age: 10886400,
        endpoints: [{ url: '/api/csp-report' }],
        include_subdomains: true
      }));
    }
    return response;
  }
  
  // User is authenticated, allow access to protected routes
  if (user) {
    if (!isStaticAsset) {
      // Determine which CSP to use based on route
      const csp = path.includes('/collection/spirit/') 
        ? createRelaxedCSPHeader(nonce) 
        : createStrictCSPHeader(nonce);
      
      response.headers.set('Content-Security-Policy', csp);
      response.headers.set('Report-To', JSON.stringify({
        group: 'csp-endpoint',
        max_age: 10886400,
        endpoints: [{ url: '/api/csp-report' }],
        include_subdomains: true
      }));
      
      // Add detailed debug headers
      response.headers.set('X-Auth-Debug-Authenticated', 'true');
      response.headers.set('X-Auth-Debug-UserId', user.id);
      response.headers.set('X-Auth-Debug-Path', path);
      
      // Log authenticated access
      console.log(`[Auth Debug] ✅ Authenticated access: ${path} for user ${user.id.substring(0, 8)}...`);
    }
    
    // Potentially trigger background video sync for relevant pages
    if (path === '/past-tastings' || path === '/dashboard' || path === '/') {
      triggerBackgroundVideoSync();
    }
    
    return response;
  }
  
  // If we get here: user is NOT authenticated AND it's NOT a public route
  // For protected routes, redirect to login
  if (isProtected) {
    console.log(`[Auth Debug] 🔒 Protected route access denied for: ${path}`);
    
    // Build login URL with redirect parameter
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', encodeURIComponent(path));
    
    // Create redirect response
    const redirectResponse = NextResponse.redirect(loginUrl);
    
    // Preserve all cookies from both request and response
    // First, copy request cookies to maintain existing state
    request.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    
    // Then, copy any new cookies set during this middleware execution
    // This ensures auth tokens set by Supabase are preserved
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
      // Add CSP headers to redirect
      const csp = path.includes('/collection/spirit/') 
        ? createRelaxedCSPHeader(nonce) 
        : createStrictCSPHeader(nonce);
        
      redirectResponse.headers.set('Content-Security-Policy', csp);
      redirectResponse.headers.set('Report-To', JSON.stringify({
        group: 'csp-endpoint',
        max_age: 10886400,
        endpoints: [{ url: '/api/csp-report' }],
        include_subdomains: true
      }));
      
      // Add debug headers for redirect
      redirectResponse.headers.set('X-Auth-Debug-Redirect', 'true');
      redirectResponse.headers.set('X-Auth-Debug-From', path);
      redirectResponse.headers.set('X-Auth-Debug-To', loginUrl.toString());
      redirectResponse.headers.set('X-Auth-Debug-HasAuthCookie', hasAuthCookie ? 'true' : 'false');
    }
    
    return redirectResponse;
  }
  
  // For non-public, non-protected routes with no user: just continue
  if (!isStaticAsset) {
    // Set CSP header for the response
    response.headers.set('Content-Security-Policy', createStrictCSPHeader(nonce));
  }
  
  return response;
}

// Helper function to check if a path matches a protected route pattern
function isProtectedRoute(path: string, route: string): boolean {
  // Exact match (most common case)
  if (path === route) return true;
  
  // Handle trailing slashes (normalize)
  if (path === `${route}/` || `${path}/` === route) return true;
  
  // Path prefix match (for routes like /collection/*)
  if (route.endsWith('/') && path.startsWith(route)) return true;
  
  // Additional collection-specific handling
  if (route === '/collection' && path.startsWith('/collection/')) return true;
  
  // API routes often need prefix matching
  if (route.startsWith('/api/') && path.startsWith(route)) return true;
  
  return false;
}
