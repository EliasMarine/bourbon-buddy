import { NextRequest, NextResponse } from 'next/server'
import { createCsrfCookie, generateCsrfToken, getCsrfCookieName } from '@/lib/csrf'

// GET /api/csrf - Generate a new CSRF token
export async function GET(request: NextRequest) {
  try {
    // Generate a new CSRF token and secret
    const { secret, token, createdAt } = generateCsrfToken()
    
    // Get the appropriate cookie name based on environment
    const cookieName = getCsrfCookieName()
    
    // Create a cookie with the secret
    const cookieHeader = createCsrfCookie(secret, createdAt)
    
    // Create the response with the token
    const response = NextResponse.json({ 
      csrfToken: token,
      cookieName: cookieName,
      status: 'success',
      isSecure: process.env.NODE_ENV === 'production' ? true : false,
    })
    
    // Set the cookie
    response.headers.set('Set-Cookie', cookieHeader)
    
    // Add debug headers (not visible to JavaScript)
    if (process.env.NODE_ENV !== 'production') {
      response.headers.set('X-Debug-Cookie-Set', 'true')
      response.headers.set('X-Debug-Cookie-Name', cookieName)
    }
    
    return response
  } catch (error) {
    console.error('Error generating CSRF token:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
} 