/**
 * CORS (Cross-Origin Resource Sharing) configuration
 * 
 * This module provides CORS configuration helpers to secure API endpoints
 * against cross-origin attacks while allowing legitimate cross-origin requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from './error-handlers';

// Allowed origins for CORS requests - set via environment variables
const getAllowedOrigins = (): string[] => {
  const originsString = process.env.ALLOWED_ORIGINS || '';
  if (!originsString) {
    // Default: only allow same origin in production
    return process.env.NODE_ENV === 'production' 
      ? [] 
      : ['http://localhost:3000'];
  }
  return originsString.split(',').map(origin => origin.trim());
};

/**
 * Validates if an origin is allowed based on configuration
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  const allowedOrigins = getAllowedOrigins();
  
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
  const origin = req.headers.get('origin');
  
  // If no origin header, this is likely a same-origin request
  if (!origin) {
    return res;
  }
  
  // Check if the origin is allowed
  if (isOriginAllowed(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  } else {
    // Log unauthorized CORS attempt
    logSecurityEvent(
      'unauthorized_cors_attempt', 
      { origin, path: req.nextUrl.pathname },
      'medium'
    );
  }
  
  return res;
}

/**
 * Handles CORS preflight requests (OPTIONS)
 */
export function handleCorsPreflightRequest(req: NextRequest): NextResponse {
  const origin = req.headers.get('origin');
  
  if (!origin || !isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 204 });
  }
  
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return res;
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