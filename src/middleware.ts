import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { generateDebugId } from '@/lib/debug-utils'
import crypto from 'crypto'

// Helper function to determine if verbose logging is enabled
function isVerboseLogging(): boolean {
  return process.env.DEBUG_MIDDLEWARE === 'true'
}

// Custom logger that respects the environment settings
function log(debugId: string, message: string, data?: any) {
  if (isVerboseLogging()) {
    if (data) {
      console.log(`[${debugId}] ${message}`, data);
    } else {
      console.log(`[${debugId}] ${message}`);
    }
  }
}

// Error logger (always logs errors even in production)
function logError(debugId: string, message: string, error: any) {
  console.error(`[${debugId}] ${message}`, error);
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
]

// Public routes accessible without authentication
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
  '/favicon.ico'
]

// Static asset patterns to ignore
const staticAssetPatterns = [
  /\.(jpe?g|png|gif|webp|svg|ico)$/i,
  /\.(css|js|map)$/i,
  /^\/socket\.io\//,
  /^\/api\/socketio/
]

// Get allowed domains from env
function getAllowedDomains(): string[] {
  const domains = [
    'bourbonbuddy.live',
    'bourbon-buddy.vercel.app'
  ]
  
  // Add any domains from env vars
  if (process.env.ALLOWED_DEV_ORIGINS) {
    const envDomains = process.env.ALLOWED_DEV_ORIGINS.split(',')
      .map(d => d.trim())
      .filter(Boolean)
      
    domains.push(...envDomains.map(url => {
      try {
        // Extract just the hostname from URLs
        return new URL(url).hostname
      } catch (e) {
        return url // If not a valid URL, use as is
      }
    }))
  }
  
  // Add localhost for development
  if (process.env.NODE_ENV !== 'production') {
    domains.push('localhost')
  }
  
  // Use Array.from to convert Set to Array for better TypeScript compatibility
  return Array.from(new Set(domains))
}

// Supabase-related cookies to monitor
const supabaseCookies = ['sb-access-token', 'sb-refresh-token']

// List of allowed domains
const allowedDomains = getAllowedDomains()

// Helper function to get the base path from a URL
function getBasePath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments.length > 0 ? `/${segments[0]}` : '/';
}

// Convert arrays to Sets for O(1) lookups
const protectedRoutesSet = new Set(protectedRoutes.map(route => {
  // If the route ends with a slash like '/api/spirits/', we want the base path
  return route.endsWith('/') ? route.slice(0, -1) : route;
}));

const publicRoutesSet = new Set(publicRoutes);

// Define a set to track users who have been redirected to verify-registration
// to prevent infinite redirect loops
const redirectedUsers = new Set<string>();

// Define a cleanup interval for the redirectedUsers set (clear entries older than 10 minutes)
setInterval(() => {
  redirectedUsers.clear();
}, 10 * 60 * 1000);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public/... (public files)
     * - admin/... (admin routes that need authentication)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|debug-script.js|client-debug-script.js|static/).*)',
  ],
}

export async function middleware(request: NextRequest) {
  const debugId = generateDebugId()
  
  // Log middleware execution if verbose logging is enabled
  if (isVerboseLogging()) {
    console.log(`[${debugId}] Middleware executing for ${request.url}`)
  }
  
  // Create a response from next 
  const response = NextResponse.next()
  
  try {
    // Extract the domain from the request
    const url = new URL(request.url)
    const domain = url.hostname
    
    // Only allow certain domains 
    const allowedDomains = [
      'localhost',
      'local-ipv4',
      'bourbon-buddy.vercel.app',
      'bourbonbuddy.live',
      'www.bourbonbuddy.live'
    ]
    
    // Set CORS headers for API routes
    if (url.pathname.startsWith('/api/')) {
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      
      if (isVerboseLogging()) {
        console.log(`[${debugId}] Set CORS headers for API route`)
      }
    }
    
    // Add response headers for all requests
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
    
    // Generate a random nonce for each request
    const nonce = crypto.randomBytes(16).toString('base64')
    
    // Add primary headers
    response.headers.set('x-nonce', nonce)
    // Set explicit x-csp-nonce header for use in _document.js and layout.tsx
    response.headers.set('x-csp-nonce', nonce)
    
    // Check if we should use relaxed CSP for development
    const isDevelopment = process.env.NODE_ENV !== 'production' || 
                          process.env.NEXT_PUBLIC_CSP_MODE === 'development'
    
    if (isDevelopment) {
      // Apply a very relaxed CSP for development that essentially allows everything
      response.headers.set('Content-Security-Policy', 
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; connect-src 'self' http://localhost:* https://localhost:* ws://localhost:* wss://localhost:* https://* wss://*;"
      )
    } else {
      // In production, use the strict CSP with nonce
      const cspHeader = `
        default-src 'self';
        script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic' 
          'sha256-4A/MBGXVD2ITXEBraYCO7UPf5RGK8bHB21M+Rj9prPo=' 
          'sha256-Viyac4C8o6yViUPcgS2fKtVgTmcnCOZOVQWYxPyGl+c=' 
          'sha256-cs1PeCKZCf+dKJxzDwFXd9H4JxYRpgsY2a7Q6OvUOGc='
          'sha256-MXn3aJpFWxiOTA2NYvWWK9ArpuHSUt0hk1zvjbvb118='
          'sha256-ertUDuGy6qgMhU+HGGXJPmbcPxl4hO7w59rH3WZDPWA='
          'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='
          'unsafe-inline'
          https://vercel.live https://vercel.com https://hjodvataujilredguzig.supabase.co 
          https://js.stripe.com https://appleid.cdn-apple.com https://signin.apple.com 
          https://cdn.jsdelivr.net https://cdn.paddle.com https://apis.google.com 
          https://plausible.io https://*.clarity.ms https://c.bing.com 
          https://cdn.vercel-insights.com https://va.vercel-scripts.com;
        script-src-elem 'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic' 
          'sha256-4A/MBGXVD2ITXEBraYCO7UPf5RGK8bHB21M+Rj9prPo=' 
          'sha256-Viyac4C8o6yViUPcgS2fKtVgTmcnCOZOVQWYxPyGl+c=' 
          'sha256-cs1PeCKZCf+dKJxzDwFXd9H4JxYRpgsY2a7Q6OvUOGc='
          'sha256-MXn3aJpFWxiOTA2NYvWWK9ArpuHSUt0hk1zvjbvb118='
          'sha256-ertUDuGy6qgMhU+HGGXJPmbcPxl4hO7w59rH3WZDPWA='
          'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='
          'unsafe-inline'
          https://vercel.live https://vercel.com https://hjodvataujilredguzig.supabase.co 
          https://js.stripe.com https://appleid.cdn-apple.com https://signin.apple.com 
          https://cdn.jsdelivr.net https://cdn.paddle.com https://apis.google.com 
          https://plausible.io https://*.clarity.ms https://c.bing.com 
          https://cdn.vercel-insights.com https://va.vercel-scripts.com;
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: blob: https: http:;
        font-src 'self' data: https://fonts.gstatic.com;
        connect-src 'self' https://hjodvataujilredguzig.supabase.co wss://hjodvataujilredguzig.supabase.co 
          wss://ws-us3.pusher.com https://api.openai.com https://vercel.live https://vercel.com 
          https://bourbonbuddy.live https://bourbon-buddy.vercel.app https://api.stripe.com 
          https://checkout.paddle.com https://*.ingest.sentry.io https://o4509142564667392.ingest.us.sentry.io 
          https://sentry.io https://*.sentry.io https://sentry-cdn.com https://*.clarity.ms 
          https://c.bing.com https://cdn.vercel-insights.com https://va.vercel-scripts.com https: http:;
        frame-src 'self' https://vercel.live https://vercel.com https://appleid.apple.com 
          https://js.stripe.com https://checkout.paddle.com;
        worker-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'self';
        manifest-src 'self';
        media-src 'self';
        child-src 'self' blob:;
      `.replace(/\s{2,}/g, ' ').trim()
      
      response.headers.set('Content-Security-Policy', cspHeader)
    }
    
    if (isVerboseLogging()) {
      console.log(`[${debugId}] Middleware complete`)
    }
    
    return response
  } catch (e) {
    // Log the error but proceed with the request
    console.error(`[${debugId}] Middleware error:`, e)
    return response
  }
} 