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
  '/collection',
  '/collection/', 
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

// Helper function to check if a path matches a route pattern
// SIMPLIFIED from working version to improve route matching reliability
function isPathMatch(path: string, pattern: string): boolean {
  return path.startsWith(pattern) || path.includes(pattern) || path === pattern;
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
  
  // Check for protected route using simpler matching logic
  const isProtected = protectedRoutes.some(route => isPathMatch(path, route));
  
  // Get auth state from cookies before creating supabase client
  const hasAuthCookie = !!request.cookies.get('sb-access-token') || 
                        !!request.cookies.get('supabase-auth-token') ||
                        request.cookies.getAll().some(c => c.name.startsWith('sb-'));
  
  // Initialize a base response with nonce
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Initialize Supabase client with simplified cookie handling
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
            // Set cookie in both request and response
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  )

  // IMPORTANT: DO NOT execute any code between creating the Supabase client
  // and calling auth.getUser() to prevent session inconsistency
  
  // Get user data with single reliable call
  const { data: { user } } = await supabase.auth.getUser();
  
  // Handle public routes first
  const isPublic = publicRoutes.some(route => isPathMatch(path, route));

  // Handle auth-specific routes
  const isAuthRoute = path.startsWith('/login') || 
                     path.startsWith('/signup') || 
                     path.startsWith('/auth');

  if (isPublic) {
    // For public routes, return the response
    if (!isStaticAsset) {
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
  
  // Authenticated user, allow access to protected routes
  if (user) {
    // If user is authenticated but trying to access auth routes, redirect to dashboard
    if (isAuthRoute) {
      const dashboardUrl = new URL('/dashboard', request.url);
      const redirectResponse = NextResponse.redirect(dashboardUrl);
      
      // Copy cookies from request to redirect response
      request.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      
      // Also copy any new cookies set during middleware execution
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          maxAge: cookie.maxAge,
          secure: cookie.secure,
          sameSite: cookie.sameSite as "strict" | "lax" | "none" | undefined
        });
      });
      
      // Set CSP headers for the redirect
      if (!isStaticAsset) {
        redirectResponse.headers.set('Content-Security-Policy', createStrictCSPHeader(nonce));
      }
      
      return redirectResponse;
    }
    
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
      
      // Add auth debug headers in non-production
      if (process.env.NODE_ENV !== 'production') {
        response.headers.set('X-Auth-Debug-Authenticated', 'true');
        response.headers.set('X-Auth-Debug-UserId', user.id);
        response.headers.set('X-Auth-Debug-Path', path);
      }
    }
    
    // Potentially trigger background video sync for relevant pages
    if (path === '/past-tastings' || path === '/dashboard' || path === '/') {
      triggerBackgroundVideoSync();
    }
    
    return response;
  }
  
  // If we get here: user is NOT authenticated AND it's NOT a public route
  // Redirect to login for protected routes
  if (isProtected) {
    // Build login URL with redirect parameter
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', encodeURIComponent(path));
    
    // Create redirect response
    const redirectResponse = NextResponse.redirect(loginUrl);
    
    // Copy cookies from request to redirect response
    request.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    
    // Also copy any new cookies set during middleware execution
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, {
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        maxAge: cookie.maxAge,
        secure: cookie.secure,
        sameSite: cookie.sameSite as "strict" | "lax" | "none" | undefined
      });
    });

    if (!isStaticAsset) {
      // Set CSP headers for the redirect
      redirectResponse.headers.set('Content-Security-Policy', createStrictCSPHeader(nonce));
      
      // Add debug headers in non-production
      if (process.env.NODE_ENV !== 'production') {
        redirectResponse.headers.set('X-Auth-Debug-Redirect', 'true');
        redirectResponse.headers.set('X-Auth-Debug-From', path);
        redirectResponse.headers.set('X-Auth-Debug-To', loginUrl.toString());
        redirectResponse.headers.set('X-Auth-Debug-HasAuthCookie', hasAuthCookie ? 'true' : 'false');
      }
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
