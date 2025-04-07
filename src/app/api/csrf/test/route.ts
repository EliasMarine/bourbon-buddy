import { NextRequest, NextResponse } from 'next/server'
import { validateCsrfToken } from '@/lib/csrf'
import { parseCookies, getCsrfCookieName, extractCsrfSecret } from '@/lib/csrf'

// Simple test endpoint for CSRF validation
export async function POST(request: NextRequest) {
  try {
    // Extract the CSRF token from headers
    const xCsrfToken = request.headers.get('x-csrf-token')
    const csrfTokenHeader = request.headers.get('csrf-token')
    const xCsrfTokenUpper = request.headers.get('X-CSRF-Token')
    const csrfToken = xCsrfToken || csrfTokenHeader || xCsrfTokenUpper
    
    // Log all headers for debugging
    const headersObj: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headersObj[key] = value
    })
    
    // Log all cookies for debugging
    const cookiesObj: Record<string, string> = {}
    request.cookies.getAll().forEach(cookie => {
      cookiesObj[cookie.name] = cookie.value
    })
    
    // Validate the CSRF token
    const isValidCsrf = validateCsrfToken(request, csrfToken || undefined)
    
    if (!isValidCsrf) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid CSRF token',
          debug: {
            headers: headersObj,
            cookies: cookiesObj,
            csrfToken
          }
        },
        { status: 403 }
      )
    }
    
    // Read the request body
    const body = await request.json().catch(() => ({}))
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'CSRF validation successful',
      receivedData: body,
      debug: {
        headers: headersObj,
        cookies: cookiesObj,
        csrfToken
      }
    })
  } catch (error) {
    console.error('CSRF test error:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Test API endpoint for debugging CSRF cookie issues
 * Responds with information about cookies and their values
 */
export async function GET(request: NextRequest) {
  try {
    // Get all cookie information for debugging
    const cookieHeader = request.headers.get('cookie')
    const parsedCookies = cookieHeader ? parseCookies(cookieHeader) : {}
    const cookieName = getCsrfCookieName()
    const secretData = extractCsrfSecret(parsedCookies)
    
    // Get headers for debugging
    const isSecure = request.headers.get('x-forwarded-proto') === 'https'
    const host = request.headers.get('host')
    const origin = request.headers.get('origin')
    
    // Return diagnostic information
    return NextResponse.json({
      environment: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production',
      isSecure,
      host,
      origin,
      protocol: request.nextUrl.protocol,
      expectedCsrfCookieName: cookieName,
      hasCsrfCookie: !!secretData,
      cookieNames: Object.keys(parsedCookies),
      csrfCookiePrefix: cookieName.split('-')[0],
      // Don't return all cookie values for security
      hasSessionCookie: Object.keys(parsedCookies).some(name => name.includes('session')),
      headers: {
        hasSecureFlagInRequest: request.headers.get('x-forwarded-proto') === 'https',
        xForwardedProto: request.headers.get('x-forwarded-proto'),
        xForwardedHost: request.headers.get('x-forwarded-host'),
      }
    })
  } catch (error) {
    console.error('Error in CSRF test endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to get CSRF debug information' },
      { status: 500 }
    )
  }
} 