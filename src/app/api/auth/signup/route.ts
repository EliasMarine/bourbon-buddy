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
    console.log('Signup request received');
    
    // Log the request headers for debugging
    const headerKeys = Array.from(req.headers.keys());
    console.log('Request headers:', headerKeys.map(key => `${key}: ${req.headers.get(key)}`));
    
    // Parse request body
    const body = await req.json();
    console.log('Request body received:', {
      email: body.email ? `${body.email.substring(0, 3)}***` : 'missing',
      password: body.password ? '********' : 'missing',
      username: body.username || 'missing',
      namePresent: !!body.name,
      bodyKeys: Object.keys(body)
    });
    
    // Extract fields with fallbacks
    const email = body.email;
    const password = body.password;
    let username = body.username;
    const name = body.name;
    
    // If username is missing but email is present, derive username from email
    if (!username && email) {
      username = email.split('@')[0];
      console.log('Generated username from email:', username);
    }
    
    // Ensure username follows acceptable format (letters, numbers, underscores, hyphens)
    if (username) {
      // First, sanitize by replacing invalid characters with underscores
      const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      // If sanitization changed the username, use the sanitized version
      if (sanitizedUsername !== username) {
        console.log(`Sanitized username from "${username}" to "${sanitizedUsername}"`);
        username = sanitizedUsername;
      }
      
      // Ensure minimum length
      if (username.length < 3) {
        // Pad with underscores if too short
        username = username.padEnd(3, '_');
        console.log('Username was too short, padded to:', username);
      }
    }
    
    // Debug mode
    const isDebugMode = process.env.DEBUG_AUTH === 'true' || process.env.NODE_ENV === 'development';
    
    // Validate input
    if (!email || !password || !username) {
      console.error('Missing required fields:', { 
        hasEmail: !!email, 
        hasPassword: !!password, 
        hasUsername: !!username 
      });
      
      const response = NextResponse.json(
        { 
          error: 'Email, password, and username are required',
          details: {
            missingEmail: !email,
            missingPassword: !password,
            missingUsername: !username,
            receivedFields: Object.keys(body)
          }
        },
        { status: 400 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    // Only validate CSRF in production
    if (process.env.NODE_ENV === 'production') {
      // Extract token from header
      const csrfToken = req.headers.get('x-csrf-token') || 
                        req.headers.get('csrf-token') || 
                        req.headers.get('X-CSRF-Token');
      
      // Check for special bypass header for testing purposes
      const bypassHeader = req.headers.get('X-Bypass-CSRF-Test');
      const shouldBypassCsrf = process.env.NODE_ENV !== 'production' && 
                              bypassHeader === process.env.CSRF_BYPASS_KEY;
      
      if (shouldBypassCsrf) {
        console.log('⚠️ WARNING: CSRF validation bypassed for testing');
      } else if (!csrfToken) {
        console.warn('Production signup without CSRF token');
        // In production, fail if no CSRF token
        if (process.env.BYPASS_CSRF !== 'true') {
          const response = NextResponse.json(
            { error: 'Missing CSRF token' },
            { status: 403 }
          );
          setCorsHeaders(req, response);
          return response;
        }
      } else if (!validateCsrfToken(req, csrfToken)) {
        console.warn('Invalid CSRF token in signup request');
        // Only enforce in production
        if (process.env.BYPASS_CSRF !== 'true') {
          const response = NextResponse.json(
            { error: 'Invalid CSRF token' },
            { status: 403 }
          );
          setCorsHeaders(req, response);
          return response;
        }
      }
    }
    
    // Initialize Supabase client
    console.log('Initializing Supabase client for signup');
    const supabase = await createClient();
    
    if (!supabase) {
      console.error('Failed to create Supabase client');
      const response = NextResponse.json(
        { error: 'Internal server error: Unable to connect to auth service' },
        { status: 500 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    // Prepare user metadata
    const userData = {
      username,
      full_name: name || '',
      display_name: name || username,
    };
    
    console.log('Signing up with Supabase using email:', email ? email.substring(0, 3) + '***' : 'missing');
    
    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Store additional user metadata
        data: userData,
        // Email confirmation is required
        emailRedirectTo: `${new URL(req.url).origin}/auth/callback`,
      }
    });
    
    if (error) {
      console.error('Supabase signup error:', error.message);
      
      // Determine appropriate status code based on error message
      let statusCode = 400; // Default to 400 Bad Request
      
      // User already exists errors should return 409 Conflict
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        statusCode = 409;
      }
      
      // Authentication errors (like weak password) should stay 400
      if (error.message.includes('password')) {
        statusCode = 400;
      }
      
      // Server-side or database errors should return 500
      if (error.message.includes('database') || error.message.includes('internal') || error.message.includes('timeout')) {
        statusCode = 500;
      }
      
      const response = NextResponse.json(
        { error: error.message },
        { status: statusCode }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    console.log('Supabase signup successful, user created with ID:', data.user?.id);
    
    // Success response
    const response = NextResponse.json({
      message: 'User created successfully',
      user: data.user,
      session: data.session,
    });
    
    setCorsHeaders(req, response);
    return response;
  } catch (error: any) {
    console.error('Uncaught error in signup handler:', error);
    
    // Provide more details about the error
    const errorDetails = {
      message: error.message || 'Unknown error',
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    const response = NextResponse.json(
      { 
        error: 'Signup failed due to server error',
        details: errorDetails
      },
      { status: 500 }
    );
    setCorsHeaders(req, response);
    return response;
  }
}
