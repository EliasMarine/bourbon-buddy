import { NextRequest, NextResponse } from 'next/server'
import { validateCsrfToken } from '@/lib/csrf'

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