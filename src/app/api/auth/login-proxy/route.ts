import { NextRequest, NextResponse } from 'next/server'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'
import { validateCsrfToken } from '@/lib/csrf'
import { createClient } from '@/utils/supabase/server'

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req)
}

/**
 * Login proxy endpoint that adds proper CSRF protection and cookie handling
 */
export async function POST(req: NextRequest) {
  try {
    const isVercelPreview = process.env.VERCEL_ENV === 'preview' || 
                           process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Debug CSRF token - always log these details
    console.log('Login-proxy request details:', {
      method: req.method,
      url: req.url,
      host: req.headers.get('host'),
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer'),
      csrfTokenHeader: req.headers.get('X-CSRF-Token') ? 
        `${req.headers.get('X-CSRF-Token')?.substring(0, 5)}...` : 'missing',
      hasCookie: !!req.headers.get('cookie'),
      cookieNames: req.headers.get('cookie')?.split(';').map(c => c.trim().split('=')[0]).join(', '),
    })
    
    // Skip CSRF validation in development or provide detailed error in preview
    let csrfValidated = false
    if (isDevelopment && process.env.BYPASS_CSRF === 'true') {
      console.log('Skipping CSRF validation in development mode')
      csrfValidated = true
    } else {
      // Attempt validation
      csrfValidated = validateCsrfToken(req)
      
      if (!csrfValidated) {
        // Enhanced error information in all environments to help debug
        console.error('Login proxy CSRF validation failed', {
          headers: Array.from(req.headers.entries())
            .filter(([key]) => !key.toLowerCase().includes('authorization'))
            .map(([key, value]) => `${key}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`)
            .join(', '),
          hasCookie: !!req.headers.get('cookie'),
          cookieNames: req.headers.get('cookie')?.split(';').map(c => c.trim().split('=')[0]).join(', '),
          hasOrigin: !!req.headers.get('origin'),
          hasXCSRFToken: !!req.headers.get('X-CSRF-Token'),
          xcsrfTokenLength: req.headers.get('X-CSRF-Token')?.length || 0,
          method: req.method,
          url: req.url,
        })
        
        // Different error messages based on environment
        if (isVercelPreview || isDevelopment) {
          return NextResponse.json(
            { 
              error: 'Invalid CSRF token',
              details: 'CSRF token validation failed. This is likely a cross-origin issue.',
              help: 'Ensure cookies are being sent with your request and check browser console for CORS errors.',
              hasToken: !!req.headers.get('X-CSRF-Token'),
              hasCookie: !!req.headers.get('cookie'),
              debug: true
            },
            { status: 403 }
          )
        }
        
        // Standard error in production
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        )
      }
    }

    // Extract credentials from request body
    const { email, password } = await req.json()

    if (!email || !password) {
      const response = NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
      setCorsHeaders(req, response)
      return response
    }

    // Initialize Supabase client
    const supabase = await createClient()

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Login proxy error:', error.message)
      const response = NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
      setCorsHeaders(req, response)
      return response
    }

    // Return session data to client
    const response = NextResponse.json({
      message: 'Login successful',
      session: data.session,
      user: data.user,
    })

    // Set proper CORS headers
    setCorsHeaders(req, response)
    return response
  } catch (error) {
    console.error('Login proxy error:', error)
    const response = NextResponse.json(
      { error: 'Login failed due to server error' },
      { status: 500 }
    )
    setCorsHeaders(req, response)
    return response
  }
} 