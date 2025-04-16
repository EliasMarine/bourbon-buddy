import { NextRequest, NextResponse } from 'next/server'
import { createCsrfCookie, generateCsrfToken, getCsrfCookieName } from '@/lib/csrf'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req)
}

/**
 * Generates a CSRF token and sets it as a cookie
 */
export async function GET(req: NextRequest) {
  try {
    // Generate a new token
    const { secret, token, createdAt } = generateCsrfToken()
    
    // Get the cookie name
    const cookieName = getCsrfCookieName()
    
    // Create response with token
    const response = NextResponse.json({
      csrfToken: token,
      cookieName,
      status: 'success'
    })
    
    // Set the cookie with proper headers
    const cookieHeader = createCsrfCookie(secret, createdAt)
    response.headers.set('Set-Cookie', cookieHeader)
    
    // Set proper CORS headers
    setCorsHeaders(req, response)
    
    return response
  } catch (error) {
    console.error('Error generating CSRF token:', error)
    
    const errorResponse = NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
    
    setCorsHeaders(req, errorResponse)
    return errorResponse
  }
} 