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
    }, { status: 200 })
    
    // Set the cookie with proper headers
    response.headers.set('Set-Cookie', cookieHeader)
    
    // Set CORS headers to ensure this endpoint works in all environments
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    
    // Add debug headers (not visible to JavaScript)
    if (process.env.NODE_ENV !== 'production') {
      response.headers.set('X-Debug-Cookie-Set', 'true')
      response.headers.set('X-Debug-Cookie-Name', cookieName)
      response.headers.set('X-Debug-Token-Length', token.length.toString())
    }
    
    return response
  } catch (error) {
    console.error('Error generating CSRF token:', error)
    
    // Create a fallback response
    const response = NextResponse.json(
      { error: 'Failed to generate CSRF token', status: 'error' },
      { status: 500 }
    )
    
    // Still set CORS headers on error
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    
    return response
  }
}

// Add OPTIONS method for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
  return response
} 