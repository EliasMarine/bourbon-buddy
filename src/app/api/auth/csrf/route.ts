import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, createCsrfCookie } from '@/lib/csrf';

/**
 * CSRF token endpoint
 * Generates a new CSRF token and sets it in a cookie
 */
export async function GET(request: NextRequest) {
  try {
    // Generate a new CSRF token
    const { token, secret, createdAt } = generateCsrfToken();
    
    // Create a cookie with the secret
    const cookieHeader = createCsrfCookie(secret, createdAt);
    
    // Create response with the token
    const response = NextResponse.json({ 
      csrfToken: token, 
      expires: new Date(createdAt + 60 * 60 * 24 * 7 * 1000).toISOString() // 7 days
    });
    
    // Set the cookie header
    response.headers.set('Set-Cookie', cookieHeader);
    
    return response;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
} 