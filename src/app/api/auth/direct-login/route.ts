import { NextRequest, NextResponse } from 'next/server'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'
import { validateCsrfToken } from '@/lib/csrf'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase admin client for auth operations
// This bypasses RLS and uses direct admin API access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req)
}

/**
 * Emergency direct login endpoint that bypasses potential issues 
 * with the normal login flow by using the service role key
 */
export async function POST(req: NextRequest) {
  try {
    const isVercelPreview = process.env.VERCEL_ENV === 'preview' || 
                           process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Debug CSRF token - always log these details
    console.log('Direct-login request details:', {
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
        console.error('Direct login CSRF validation failed', {
          hasXCSRFToken: !!req.headers.get('X-CSRF-Token'),
          method: req.method,
          url: req.url,
        })
        
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

    // Authenticate with Supabase Admin client
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Direct login error:', error.message)
      const response = NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
      setCorsHeaders(req, response)
      return response
    }

    // Get user metadata to include in response
    const { data: userData } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', data.user.id)
      .single()

    // Return session data to client
    const response = NextResponse.json({
      message: 'Login successful via direct endpoint',
      session: data.session,
      user: data.user,
      userData: userData || {},
    })

    // Set proper CORS headers
    setCorsHeaders(req, response)
    return response
  } catch (error) {
    console.error('Direct login error:', error)
    const response = NextResponse.json(
      { error: 'Login failed due to server error' },
      { status: 500 }
    )
    setCorsHeaders(req, response)
    return response
  }
} 