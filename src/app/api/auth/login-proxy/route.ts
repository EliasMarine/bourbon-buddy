import { NextRequest, NextResponse } from 'next/server'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'
import { validateCsrfToken } from '@/lib/csrf'
import { createClient as createSupabaseClient } from '@/lib/auth'

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req)
}

/**
 * Login proxy endpoint for the login page
 * This route handles signing in without CORS issues
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Login proxy endpoint called')
    
    // Check for CSRF token but be more lenient in development
    const csrfToken = req.headers.get('x-csrf-token') || 
                     req.headers.get('csrf-token') || 
                     req.headers.get('X-CSRF-Token')
    
    // Log headers for debugging
    console.log('Request headers:', {
      hasCsrfToken: !!csrfToken,
      csrfTokenValue: csrfToken?.substring(0, 5) + '...',
      contentType: req.headers.get('content-type'),
      cookie: !!req.headers.get('cookie'),
      origin: req.headers.get('origin')
    })
    
    // Skip CSRF validation in development mode
    if (process.env.NODE_ENV !== 'production') {
      console.log('Skipping CSRF validation in development mode')
    } else if (!csrfToken) {
      console.error('Login proxy error: Missing CSRF token')
      const response = NextResponse.json(
        { error: 'CSRF token missing. Please refresh the page and try again.' },
        { status: 403 }
      )
      setCorsHeaders(req, response)
      return response
    } else {
      const isValid = validateCsrfToken(req, csrfToken)
      if (!isValid) {
        console.error('Login proxy error: Invalid CSRF token')
        const response = NextResponse.json(
          { error: 'CSRF token invalid. Please refresh the page and try again.' },
          { status: 403 }
        )
        setCorsHeaders(req, response)
        return response
      }
    }
    
    // Extract body with more error handling
    let body;
    try {
      body = await req.json();
      console.log('Request body parsed successfully', { 
        hasEmail: !!body.email, 
        hasPassword: !!body.password 
      });
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      const response = NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    const { email, password } = body
    
    if (!email || !password) {
      console.error('Login proxy error: Missing email or password')
      const response = NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
      setCorsHeaders(req, response)
      return response
    }
    
    // Validate Supabase configuration
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Login proxy error: Missing Supabase environment variables')
      const response = NextResponse.json(
        { error: 'Authentication service unavailable. Please contact support.' },
        { status: 500 }
      )
      setCorsHeaders(req, response)
      return response
    }
    
    console.log('Attempting direct authentication without Supabase client')
    
    // Log actual URL and key prefix for debugging (safely)
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 15) + '...')
    console.log('Supabase Anon Key starts with:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + '...')
    
    console.log('Attempting to sign in user with email:', email.substring(0, 3) + '***')
    
    // Perform login with more detailed error handling
    try {
      console.log('About to attempt authentication with direct fetch API call')
      
      // Make direct API call to Supabase Auth
      const headers = {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'X-Client-Info': 'bourbon-buddy-app'
      };
      
      console.log('Request headers:', Object.keys(headers).join(', '));
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          password,
        })
      })
      
      const data = await response.json()
      
      console.log('Authentication response received:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!data,
        hasError: !response.ok,
        errorName: data.error || 'None'
      })
      
      if (!response.ok) {
        console.error('Login proxy authentication error:', 
          data.error || response.statusText, 
          response.status,
          'Error name:', data.error_description || 'Unknown error'
        )
        
        // Log more details about the error
        if (response.status === 401) {
          console.error('This is likely an auth issue with user credentials')
          
          // Analyze 401 error in more detail
          let errorDetail = 'Authentication failed';
          let errorCode = 'auth_failed';
          
          // Look for specific error patterns in the response
          if (data.error === 'invalid_grant') {
            if (data.error_description?.includes('email')) {
              errorDetail = 'Email not found or user does not exist';
              errorCode = 'invalid_email';
            } else if (data.error_description?.includes('password')) {
              errorDetail = 'Invalid password';
              errorCode = 'invalid_password';
            } else if (data.error_description?.toLowerCase().includes('not confirmed')) {
              errorDetail = 'Email not confirmed. Please check your inbox and verify your email.';
              errorCode = 'email_not_confirmed';
            } else if (data.error_description?.toLowerCase().includes('mfa')) {
              errorDetail = 'MFA required but not implemented in this flow';
              errorCode = 'mfa_required';
            }
          } else if (data.error === 'invalid_request') {
            errorDetail = 'Invalid request format. Please check your credentials.';
            errorCode = 'invalid_request';
          }
          
          // Log detailed error for debugging
          console.error('Detailed 401 analysis:', {
            errorCode,
            errorDetail,
            originalError: data.error,
            originalDescription: data.error_description
          });
          
          const errorResponse = NextResponse.json(
            { 
              error: errorDetail,
              code: errorCode,
              original_error: data.error,
              original_description: data.error_description
            },
            { status: response.status }
          )
          setCorsHeaders(req, errorResponse)
          return errorResponse
        } else if (response.status === 400) {
          console.error('This is likely a malformed request')
          console.error('Error details:', data)
        }
        
        const errorResponse = NextResponse.json(
          { error: data.error_description || data.error || 'Authentication failed' },
          { status: response.status }
        )
        setCorsHeaders(req, errorResponse)
        return errorResponse
      }
      
      console.log('Login successful for user:', email.substring(0, 3) + '***')
      
      // Create the success response with session data
      const successResponse = NextResponse.json({
        status: 'success',
        session: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
          expires_in: data.expires_in,
          token_type: data.token_type
        },
        user: data.user
      })
      
      // Set CORS headers
      setCorsHeaders(req, successResponse)
      return successResponse
    } catch (authError) {
      console.error('Supabase auth error:', authError)
      const response = NextResponse.json(
        { error: 'Authentication failed. Please check your credentials.' },
        { status: 401 }
      )
      setCorsHeaders(req, response)
      return response
    }
  } catch (error) {
    console.error('Login proxy critical error:', error)
    const response = NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
    setCorsHeaders(req, response)
    return response
  }
} 