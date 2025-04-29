import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors';
import { validateCsrfToken } from '@/lib/csrf';

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req);
}

/**
 * Handle signup requests
 */
export async function POST(req: NextRequest) {
  try {
    // Validate CSRF token in production
    if (process.env.NODE_ENV === 'production' && !validateCsrfToken(req)) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const { email, password, username, name } = body;
    
    // Validate input
    if (!email || !password || !username) {
      const response = NextResponse.json(
        { error: 'Email, password, and username are required' },
        { status: 400 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    // Initialize Supabase client
    const supabase = await createClient();
    
    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Store additional user metadata
        data: {
          username,
          full_name: name || '',
          display_name: name || username,
        },
        // Email confirmation is required
        emailRedirectTo: `${new URL(req.url).origin}/auth/callback`,
      }
    });
    
    if (error) {
      console.error('Signup error:', error.message);
      const response = NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    // Success response
    const response = NextResponse.json({
      message: 'User created successfully',
      user: data.user,
      session: data.session,
    });
    
    setCorsHeaders(req, response);
    return response;
  } catch (error: any) {
    console.error('Signup error:', error);
    const response = NextResponse.json(
      { error: 'Signup failed due to server error' },
      { status: 500 }
    );
    setCorsHeaders(req, response);
    return response;
  }
}
