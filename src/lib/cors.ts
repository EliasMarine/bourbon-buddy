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
 * Adds CORS headers to a response based on the request origin
 */
export function setCorsHeaders(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin') || '';
  
  // Check if the origin is in our allowed list
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? 
    origin : ALLOWED_ORIGINS[0];
  
  // Set CORS headers
  res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 
    'Content-Type, Authorization, X-CSRF-Token, csrf-token, x-csrf-token, CSRF-Token');
  res.headers.set('Access-Control-Max-Age', '86400');
  
  return res;
}

/**
 * Handles CORS preflight requests (OPTIONS)
 */
export function handleCorsPreflightRequest(req: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 }); // No content
  return setCorsHeaders(req, response);
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