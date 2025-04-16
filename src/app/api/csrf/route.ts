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
    
    // Debug info for troubleshooting
    const isProduction = process.env.NODE_ENV === 'production'
    const debug = process.env.DEBUG_CSRF === 'true' || isProduction
    
    if (debug) {
      console.log('🔑 Generating CSRF token', {
        hostname: req.headers.get('host'),
        origin: req.headers.get('origin'),
        referer: req.headers.get('referer'),
        url: req.url,
        cookieName,
        tokenLength: token.length,
        hasCookies: req.cookies.size > 0,
        cookies: Array.from(req.cookies.getAll()).map(c => c.name).join(', '),
      })
    }
    
    // Create response with token
    const response = NextResponse.json({
      csrfToken: token,
      cookieName,
      status: 'success'
    })
    
    // Set the cookie with proper headers
    const cookieHeader = createCsrfCookie(secret, createdAt)
    response.headers.set('Set-Cookie', cookieHeader)
    
    // Add Cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')
    
    // Set proper CORS headers
    setCorsHeaders(req, response)
    
    // Ensure we indicate this is working correctly
    if (debug) {
      console.log('✅ CSRF token generated successfully', {
        tokenLength: token.length,
        cookieName,
        cookieSet: !!cookieHeader,
        corsHeaders: {
          'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
          'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
        },
      })
    }
    
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