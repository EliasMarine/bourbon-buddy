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
  '/login',
  '/signup',
  '/auth',
  '/api/auth',
  '/api/csrf',
  '/api/status',
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
    // Match all request paths except for static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|public/|static/).*)',
  ],
}

// Generate a cryptographically random nonce for CSP
function generateCSPNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

// Expanded for MUX Player Compatibility
// The connect-src, media-src, and img-src directives need to include all required MUX domains
// to prevent Cross-Origin Resource Sharing (CORS) issues and ensure the player works correctly
const expandedMuxDirectives = `
  img-src 'self' data: blob: https://*.mux.com https://image.mux.com https://mux.com https://vercel.live https://vercel.com https://*.pusher.com/ https://*.amazonaws.com https://*.supabase.co https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://*.redd.it https://preview.redd.it https://i.redd.it https://www.buffalotracedistillery.com https://www.blantonsbourbon.com https://barbank.com https://woodencork.com https://whiskeycaviar.com https://bdliquorwine.com https://bourbonbuddy.s3.ca-west-1.s4.mega.io https://www.oldforester.com https://www.makersmark.com https://www.fourrosesbourbon.com https://www.knobcreek.com https://www.angelsenvy.com https://www.woodfordreserve.com https://www.jackdaniels.com https://www.heavenhill.com https://wine-searcher.com https://distillerytrail.com https://*.google.com https://*.bing.com https://serpapi.com https://*.serpapi.com https://*.lpwinesandliquors.com https://*.whiskyadvocate.com https://*.shopify.com https://*.akamaized.net https://*.wine-searcher.com https://*.thewhiskyexchange.com;
  media-src 'self' blob: https://*.mux.com https://mux.com https://stream.mux.com https://assets.mux.com https://image.mux.com https://*.fastly.mux.com https://*.cloudflare.mux.com https://*.litix.io;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mux.com https://mux.com https://inferred.litix.io https://*.litix.io https://stream.mux.com https://assets.mux.com https://*.mux.com https://*.fastly.mux.com https://*.cloudflare.mux.com https://storage.googleapis.com https://vercel.live https://vercel.com https://*.pusher.com wss://*.pusher.com https://vitals.vercel-insights.com https://serpapi.com https://*.serpapi.com;
  frame-src 'self' https://vercel.live https://vercel.com https://*.mux.com;
  script-src-elem 'self' 'unsafe-inline' https://www.gstatic.com https://assets.mux.com https://mux.com https://cdn.jsdelivr.net;
`;

// Create Content Security Policy with nonce
function createCSPHeader(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isVercelPreview = process.env.VERCEL_ENV === 'preview' || 
                          process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  
  // Base CSP directives common to all environments
  const baseDirectives = `
    default-src 'self';
    font-src 'self' https://vercel.live https://fonts.googleapis.com https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${expandedMuxDirectives}
    upgrade-insecure-requests;
  `;

  // Development mode: add unsafe-eval for hot reloading but keep styles secure with nonce
  if (isDevelopment) {
    return `
      ${baseDirectives}
      script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://www.gstatic.com https://assets.mux.com https://vercel.live https://vercel.com;
      style-src 'self' 'nonce-${nonce}' https://vercel.com https://fonts.googleapis.com 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'sha256-7lAG9nNPimWNBky6j9qnn0jfFzu5wK96KOj/UzoG0hg=' 'sha256-LL1Oj3pIToBpzHWMlAyrmK9guWSsY8Nr8wq7gA/m/ew=' 'sha256-8mIk1oX3LmRB+UWuFGvbo1hLWczGs3Z5yXDPHotWXlQ=' 'sha256-ZYns29och5nBGFV2O2mG0POX+mI2q4UFtJuvS1eoGF0=' 'sha256-DSYmRr35z6zyfy04z49VxSw/Fjw5T+rlVRbZWRT8U/I=' 'sha256-OYG2xTYpFINTWWpa7AYS4DfPiIyxrHaKeuWu5xqQjPE=' 'sha256-nzTgYzXYDNe6BAHiiI7NNlfK8n/auuOAhh2t92YvuXo=' 'sha256-Nqnn8clbgv+5l0PgxcTOldg8mkMKrFn4TvPL+rYUUGg=' 'sha256-13vrThxdyT64GcXoTNGVoRRoL0a7EGBmOJ+lemEWyws=' 'sha256-QZ52fjvWgIOIOPr+gRIJZ7KjzNeTBm50Z+z9dH4N1/8=' 'sha256-yOU6eaJ75xfag0gVFUvld5ipLRGUy94G17B1uL683EU=' 'sha256-OpTmykz0m3o5HoX53cykwPhUeU4OECxHQlKXpB0QJPQ=' 'sha256-SSIM0kI/u45y4gqkri9aH+la6wn2R+xtcBj3Lzh7qQo=' 'sha256-ZH/+PJIjvP1BctwYxclIuiMu1wItb0aasjpXYXOmU0Y=' 'sha256-58jqDtherY9NOM+ziRgSqQY0078tAZ+qtTBjMgbM9po=' 'sha256-7Ri/I+PfhgtpcL7hT4A0VJKI6g3pK0ZvIN09RQV4ZhI=' 'sha256-+1ELCr8ReJfJBjWJ10MIbLJZRYsIfwdKV+UKdFVDXyo=' 'sha256-MktN23nRzohmT1JNxPQ0B9CzVW6psOCbvJ20j9YxAxA=' 'sha256-47lXINn3kn6TjA9CnVQoLLxD4bevVlCtoMcDr8kZ1kc=' 'sha256-wkAU1AW/h8RKmZ3BUsffwzbTWBeIGD83S5VR9RhiQtk=' 'sha256-MQsH+WZ41cJWVrTw3AC5wJ8LdiYKgwTlENhYI5UKpow=' 'sha256-TIidHKBLbE0MY7TLE+9G8QOzGXaS7aIwJ1xJRtTd3zk='
    `;
  }
  
  // Vercel Preview: Keep both script and style secure with nonces and hashes
  if (isVercelPreview) {
    return `
      ${baseDirectives}
      script-src 'self' 'nonce-${nonce}' https://www.gstatic.com https://assets.mux.com https://vercel.live https://vercel.com;
      style-src 'self' 'nonce-${nonce}' https://vercel.com https://fonts.googleapis.com 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'sha256-7lAG9nNPimWNBky6j9qnn0jfFzu5wK96KOj/UzoG0hg=' 'sha256-LL1Oj3pIToBpzHWMlAyrmK9guWSsY8Nr8wq7gA/m/ew=' 'sha256-8mIk1oX3LmRB+UWuFGvbo1hLWczGs3Z5yXDPHotWXlQ=' 'sha256-ZYns29och5nBGFV2O2mG0POX+mI2q4UFtJuvS1eoGF0=' 'sha256-DSYmRr35z6zyfy04z49VxSw/Fjw5T+rlVRbZWRT8U/I=' 'sha256-OYG2xTYpFINTWWpa7AYS4DfPiIyxrHaKeuWu5xqQjPE=' 'sha256-nzTgYzXYDNe6BAHiiI7NNlfK8n/auuOAhh2t92YvuXo=' 'sha256-Nqnn8clbgv+5l0PgxcTOldg8mkMKrFn4TvPL+rYUUGg=' 'sha256-13vrThxdyT64GcXoTNGVoRRoL0a7EGBmOJ+lemEWyws=' 'sha256-QZ52fjvWgIOIOPr+gRIJZ7KjzNeTBm50Z+z9dH4N1/8=' 'sha256-yOU6eaJ75xfag0gVFUvld5ipLRGUy94G17B1uL683EU=' 'sha256-OpTmykz0m3o5HoX53cykwPhUeU4OECxHQlKXpB0QJPQ=' 'sha256-SSIM0kI/u45y4gqkri9aH+la6wn2R+xtcBj3Lzh7qQo=' 'sha256-ZH/+PJIjvP1BctwYxclIuiMu1wItb0aasjpXYXOmU0Y=' 'sha256-58jqDtherY9NOM+ziRgSqQY0078tAZ+qtTBjMgbM9po=' 'sha256-7Ri/I+PfhgtpcL7hT4A0VJKI6g3pK0ZvIN09RQV4ZhI=' 'sha256-+1ELCr8ReJfJBjWJ10MIbLJZRYsIfwdKV+UKdFVDXyo=' 'sha256-MktN23nRzohmT1JNxPQ0B9CzVW6psOCbvJ20j9YxAxA=' 'sha256-47lXINn3kn6TjA9CnVQoLLxD4bevVlCtoMcDr8kZ1kc=' 'sha256-wkAU1AW/h8RKmZ3BUsffwzbTWBeIGD83S5VR9RhiQtk=' 'sha256-MQsH+WZ41cJWVrTw3AC5wJ8LdiYKgwTlENhYI5UKpow=' 'sha256-TIidHKBLbE0MY7TLE+9G8QOzGXaS7aIwJ1xJRtTd3zk='
    `;
  }
  
  // Production: strict CSP with nonces and specific hashes for Mux Player
  return `
    ${baseDirectives}
    script-src 'self' 'nonce-${nonce}' https://www.gstatic.com https://assets.mux.com https://vercel.live https://vercel.com;
    style-src 'self' 'nonce-${nonce}' https://vercel.com https://fonts.googleapis.com 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'sha256-7lAG9nNPimWNBky6j9qnn0jfFzu5wK96KOj/UzoG0hg=' 'sha256-LL1Oj3pIToBpzHWMlAyrmK9guWSsY8Nr8wq7gA/m/ew=' 'sha256-8mIk1oX3LmRB+UWuFGvbo1hLWczGs3Z5yXDPHotWXlQ=' 'sha256-ZYns29och5nBGFV2O2mG0POX+mI2q4UFtJuvS1eoGF0=' 'sha256-DSYmRr35z6zyfy04z49VxSw/Fjw5T+rlVRbZWRT8U/I=' 'sha256-OYG2xTYpFINTWWpa7AYS4DfPiIyxrHaKeuWu5xqQjPE=' 'sha256-nzTgYzXYDNe6BAHiiI7NNlfK8n/auuOAhh2t92YvuXo=' 'sha256-Nqnn8clbgv+5l0PgxcTOldg8mkMKrFn4TvPL+rYUUGg=' 'sha256-13vrThxdyT64GcXoTNGVoRRoL0a7EGBmOJ+lemEWyws=' 'sha256-QZ52fjvWgIOIOPr+gRIJZ7KjzNeTBm50Z+z9dH4N1/8=' 'sha256-yOU6eaJ75xfag0gVFUvld5ipLRGUy94G17B1uL683EU=' 'sha256-OpTmykz0m3o5HoX53cykwPhUeU4OECxHQlKXpB0QJPQ=' 'sha256-SSIM0kI/u45y4gqkri9aH+la6wn2R+xtcBj3Lzh7qQo=' 'sha256-ZH/+PJIjvP1BctwYxclIuiMu1wItb0aasjpXYXOmU0Y=' 'sha256-58jqDtherY9NOM+ziRgSqQY0078tAZ+qtTBjMgbM9po=' 'sha256-7Ri/I+PfhgtpcL7hT4A0VJKI6g3pK0ZvIN09RQV4ZhI=' 'sha256-+1ELCr8ReJfJBjWJ10MIbLJZRYsIfwdKV+UKdFVDXyo=' 'sha256-MktN23nRzohmT1JNxPQ0B9CzVW6psOCbvJ20j9YxAxA=' 'sha256-47lXINn3kn6TjA9CnVQoLLxD4bevVlCtoMcDr8kZ1kc=' 'sha256-wkAU1AW/h8RKmZ3BUsffwzbTWBeIGD83S5VR9RhiQtk=' 'sha256-MQsH+WZ41cJWVrTw3AC5wJ8LdiYKgwTlENhYI5UKpow=' 'sha256-TIidHKBLbE0MY7TLE+9G8QOzGXaS7aIwJ1xJRtTd3zk='
  `;
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
  
  // Create Supabase client for SSR auth with correct cookie pattern
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Apply to request cookies first.
          // This uses the object form of `request.cookies.set`.
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options });
          });

          // Re-assign the 'response' variable from the outer scope to a new NextResponse object.
          response = NextResponse.next({
            request: {
              headers: request.headers, // Preserve original request headers
            },
          });

          // Set Supabase cookies on the newly created (or reassigned) response object.
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  )
    
  // IMPORTANT: Call supabase.auth.getUser() to handle session refresh and allow Supabase
  // to set cookies on our 'response' object via the 'setAll' handler if needed.
  const { data: { user } } = await supabase.auth.getUser()

  // Now that Supabase has had a chance to work with 'response', set CSP.
  // Use a more permissive CSP for the spirit detail pages
  let contentSecurityPolicy = '';
  
  if (!isStaticAsset) {
    // Special case for spirit detail pages which need more permissive image sources
    // We still prioritize security by using nonces and content hashes rather than unsafe-inline
    if (path.includes('/collection/spirit/')) {
      const relaxedCSP = `
        default-src 'self';
        script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://www.gstatic.com https://assets.mux.com;
        style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'sha256-7lAG9nNPimWNBky6j9qnn0jfFzu5wK96KOj/UzoG0hg=' 'sha256-LL1Oj3pIToBpzHWMlAyrmK9guWSsY8Nr8wq7gA/m/ew=' 'sha256-8mIk1oX3LmRB+UWuFGvbo1hLWczGs3Z5yXDPHotWXlQ=' 'sha256-ZYns29och5nBGFV2O2mG0POX+mI2q4UFtJuvS1eoGF0=' 'sha256-DSYmRr35z6zyfy04z49VxSw/Fjw5T+rlVRbZWRT8U/I=' 'sha256-OYG2xTYpFINTWWpa7AYS4DfPiIyxrHaKeuWu5xqQjPE=' 'sha256-nzTgYzXYDNe6BAHiiI7NNlfK8n/auuOAhh2t92YvuXo=' 'sha256-Nqnn8clbgv+5l0PgxcTOldg8mkMKrFn4TvPL+rYUUGg=' 'sha256-13vrThxdyT64GcXoTNGVoRRoL0a7EGBmOJ+lemEWyws=' 'sha256-QZ52fjvWgIOIOPr+gRIJZ7KjzNeTBm50Z+z9dH4N1/8=' 'sha256-yOU6eaJ75xfag0gVFUvld5ipLRGUy94G17B1uL683EU=' 'sha256-OpTmykz0m3o5HoX53cykwPhUeU4OECxHQlKXpB0QJPQ=' 'sha256-SSIM0kI/u45y4gqkri9aH+la6wn2R+xtcBj3Lzh7qQo=' 'sha256-ZH/+PJIjvP1BctwYxclIuiMu1wItb0aasjpXYXOmU0Y=' 'sha256-58jqDtherY9NOM+ziRgSqQY0078tAZ+qtTBjMgbM9po=' 'sha256-7Ri/I+PfhgtpcL7hT4A0VJKI6g3pK0ZvIN09RQV4ZhI=' 'sha256-+1ELCr8ReJfJBjWJ10MIbLJZRYsIfwdKV+UKdFVDXyo=' 'sha256-MktN23nRzohmT1JNxPQ0B9CzVW6psOCbvJ20j9YxAxA=' 'sha256-47lXINn3kn6TjA9CnVQoLLxD4bevVlCtoMcDr8kZ1kc=' 'sha256-wkAU1AW/h8RKmZ3BUsffwzbTWBeIGD83S5VR9RhiQtk=' 'sha256-MQsH+WZ41cJWVrTw3AC5wJ8LdiYKgwTlENhYI5UKpow=' 'sha256-TIidHKBLbE0MY7TLE+9G8QOzGXaS7aIwJ1xJRtTd3zk=';
        img-src 'self' data: https: http:;
        font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;
        connect-src 'self' https://*.supabase.co https://api.mux.com https://*;
        media-src 'self' blob: https://*.mux.com;
        object-src 'none';
        base-uri 'self';
      `.replace(/\s{2,}/g, ' ').trim();
      
      contentSecurityPolicy = relaxedCSP;
    } else {
      // Use the standard CSP for other pages
      contentSecurityPolicy = createCSPHeader(nonce).replace(/\s{2,}/g, ' ').trim();
    }
    
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  }
  
  // Handle public routes first
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route))
  if (isPublicRoute) {
    // For public routes, return the response that might have Supabase cookies (e.g., session refreshed)
    // and definitely has our CSP.
    return response;
  }
  
  // Special handling for spirit detail pages - allow if the user is authenticated
  if (path.startsWith('/collection/spirit/') && user) {
    return response;
  }
    
  // If route is protected and user is not authenticated, redirect to login
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', path)
    // Create a new response for the redirect
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Copy any cookies that Supabase might have set (captured in our 'response' object)
    // and also our CSP header to the redirectResponse.
    response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    if (!isStaticAsset) { // Also copy CSP
        redirectResponse.headers.set('Content-Security-Policy', contentSecurityPolicy);
    }
    return redirectResponse;
  }
  
  // Trigger background health check for video syncing on the past-tastings page
  // This ensures videos get updated even without explicit user action
  if (path === '/past-tastings' || path === '/') {
    triggerBackgroundVideoSync();
  }
    
  // If authenticated or not a protected route, continue
  return response
}
