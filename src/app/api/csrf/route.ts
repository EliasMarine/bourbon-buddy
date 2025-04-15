import { NextRequest, NextResponse } from 'next/server'
import { createCsrfCookie, generateCsrfToken, getCsrfCookieName } from '@/lib/csrf'

// GET /api/csrf - Generate a new CSRF token
export async function GET(request: NextRequest) {
  try {
    const requestHost = request.headers.get('host');
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    
    console.log('CSRF token requested:', {
      host: requestHost, 
      origin,
      referer,
      method: request.method
    });
    
    // Generate a new CSRF token and secret
    const { secret, token, createdAt } = generateCsrfToken();
    
    // Get the appropriate cookie name based on environment
    const cookieName = getCsrfCookieName();
    
    // Create a cookie with the secret
    const cookieHeader = createCsrfCookie(secret, createdAt);
    
    // Create the response with the token
    const response = NextResponse.json({ 
      csrfToken: token,
      cookieName: cookieName,
      status: 'success',
      isSecure: process.env.NODE_ENV === 'production' ? true : false,
    }, { status: 200 });
    
    // Set the cookie with proper headers
    response.headers.set('Set-Cookie', cookieHeader);
    
    // Set CORS headers to ensure this endpoint works in all environments
    const allowedOrigins = [
      'https://bourbonbuddy.live',
      'https://bourbon-buddy.vercel.app'
    ];
    
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3000');
    }
    
    // Determine the appropriate CORS origin
    const corsOrigin = origin && allowedOrigins.includes(origin) 
      ? origin 
      : allowedOrigins[0];
    
    response.headers.set('Access-Control-Allow-Origin', corsOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, csrf-token');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    // Add debug headers (not visible to JavaScript)
    if (process.env.NODE_ENV !== 'production') {
      response.headers.set('X-Debug-Cookie-Set', 'true');
      response.headers.set('X-Debug-Cookie-Name', cookieName);
      response.headers.set('X-Debug-Token-Length', token.length.toString());
    }
    
    console.log('CSRF token generated successfully:', {
      tokenLength: token.length,
      corsOrigin
    });
    
    return response;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    
    // Create a fallback response
    const response = NextResponse.json(
      { error: 'Failed to generate CSRF token', status: 'error' },
      { status: 500 }
    );
    
    // Still set CORS headers on error
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return response;
  }
}

// OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = NextResponse.json({}, { status: 200 });
  
  // Get origin from request
  const origin = request.headers.get('origin') || '*';
  
  // Set CORS headers
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, csrf-token');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
} 