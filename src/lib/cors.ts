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

/**
 * Determines the appropriate Access-Control-Allow-Origin value
 * based on the request's origin
 */
function determineAllowedOrigin(request?: NextRequest): string {
  // In development, be permissive
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  const origin = request?.headers.get('origin') || '';
  
  // If the origin is in our allowed list, return it
  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  
  // Default to the primary production origin
  return 'https://bourbonbuddy.live';
}

// Default CORS settings
export const DEFAULT_CORS_HEADERS = {
  // Use function to determine origin based on request
  'Access-Control-Allow-Origin': 'https://bourbonbuddy.live', // This will be replaced in setCorsHeaders
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-csrf-token, csrf-token, X-CSRF-Token',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24 hours
}

/**
 * Adds CORS headers to a response based on the request
 */
export function setCorsHeaders(req: NextRequest, res: NextResponse): NextResponse {
  // Set the proper origin based on the request
  res.headers.set('Access-Control-Allow-Origin', determineAllowedOrigin(req));
  res.headers.set('Access-Control-Allow-Methods', DEFAULT_CORS_HEADERS['Access-Control-Allow-Methods']);
  res.headers.set('Access-Control-Allow-Headers', DEFAULT_CORS_HEADERS['Access-Control-Allow-Headers']);
  res.headers.set('Access-Control-Allow-Credentials', DEFAULT_CORS_HEADERS['Access-Control-Allow-Credentials']);
  res.headers.set('Access-Control-Max-Age', DEFAULT_CORS_HEADERS['Access-Control-Max-Age']);
  
  return res;
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