/**
 * CORS (Cross-Origin Resource Sharing) configuration
 * 
 * This module provides CORS configuration helpers to secure API endpoints
 * against cross-origin attacks while allowing legitimate cross-origin requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from './error-handlers';

const ALLOWED_ORIGINS = [
  // Production
  'https://bourbonbuddy.live',
  'https://www.bourbonbuddy.live',
  'https://bourbon-buddy.vercel.app',
  // Supabase domains
  'https://hjodvataujilredguzig.supabase.co',
  // Development
  'http://localhost:3000',
  'http://localhost:4000'
];

// Default CORS settings
export const DEFAULT_CORS_HEADERS = {
  // For development, allow localhost with any port
  'Access-Control-Allow-Origin': determineAllowedOrigin(),
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-csrf-token, csrf-token, X-CSRF-Token',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24 hours
}

/**
 * Determine the allowed origin based on the current environment and request
 */
function determineAllowedOrigin(req?: NextRequest): string {
  const isProduction = process.env.NODE_ENV === 'production'
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // In development, accept localhost requests
  if (isDevelopment) {
    return 'http://localhost:3000'
  }
  
  // With an incoming request, we can be more specific
  if (req) {
    const origin = req.headers.get('origin')
    if (!origin) return isProduction ? 'https://bourbonbuddy.com' : '*'

    // Check against allowed patterns
    if (
      // Main domain
      origin.match(/^https:\/\/(www\.)?bourbonbuddy\.com$/) ||
      // Vercel preview environments 
      origin.match(/^https:\/\/bourbon-buddy.*\.vercel\.app$/) ||
      // Localhost for development
      origin.match(/^http:\/\/localhost:\d+$/)
    ) {
      return origin
    }
    
    // Default to our main domain in production, or any origin in non-production
    return isProduction ? 'https://bourbonbuddy.com' : '*'
  }
  
  // No request, default to more restrictive setting based on environment
  return isProduction ? 'https://bourbonbuddy.com' : '*'
}

/**
 * Validates if an origin is allowed based on configuration
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  const allowedOrigins = ALLOWED_ORIGINS;
  
  // If no allowed origins are configured, only allow same-origin requests
  if (allowedOrigins.length === 0) {
    return false;
  }
  
  // Check if the origin is in our allowed list
  return allowedOrigins.some(allowedOrigin => {
    // Allow exact matches
    if (allowedOrigin === origin) return true;
    
    // Allow wildcard subdomain matches
    if (allowedOrigin.startsWith('*.')) {
      const domain = allowedOrigin.substring(2);
      return origin.endsWith(domain) && origin.includes('.');
    }
    
    return false;
  });
}

/**
 * Set CORS headers on a NextResponse
 */
export function setCorsHeaders(req: NextRequest, res: NextResponse): void {
  // Get allowed origin based on request
  const allowedOrigin = determineAllowedOrigin(req)
  
  // Set default CORS headers
  res.headers.set('Access-Control-Allow-Origin', allowedOrigin)
  res.headers.set('Access-Control-Allow-Methods', DEFAULT_CORS_HEADERS['Access-Control-Allow-Methods'])
  res.headers.set('Access-Control-Allow-Headers', DEFAULT_CORS_HEADERS['Access-Control-Allow-Headers'])
  res.headers.set('Access-Control-Allow-Credentials', DEFAULT_CORS_HEADERS['Access-Control-Allow-Credentials'])
  
  // Debug output for CORS settings
  const debug = process.env.DEBUG_CORS === 'true' || process.env.NODE_ENV === 'production'
  if (debug) {
    console.log('🌐 CORS headers set:', {
      allowedOrigin,
      requestOrigin: req.headers.get('origin'),
      requestMethod: req.method,
      url: req.url,
      environment: process.env.NODE_ENV,
    })
  }
}

/**
 * Handle preflight CORS requests
 */
export function handleCorsPreflightRequest(req: NextRequest): NextResponse {
  // Create an empty response
  const response = new NextResponse(null, { status: 204 })
  
  // Set CORS headers
  setCorsHeaders(req, response)
  
  // Set Max-Age header to reduce preflight requests
  response.headers.set('Access-Control-Max-Age', DEFAULT_CORS_HEADERS['Access-Control-Max-Age'])
  
  return response
}

/**
 * Creates a CORS-enabled API route handler
 * Use this as a wrapper for API route handlers to add CORS support
 */
export function withCors(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return handleCorsPreflightRequest(req);
    }
    
    // For regular requests, call the handler and add CORS headers to the response
    try {
      const res = await handler(req);
      return setCorsHeaders(req, res);
    } catch (error) {
      console.error('Error in CORS-wrapped handler:', error);
      const errorRes = NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
      return setCorsHeaders(req, errorRes);
    }
  };
} 