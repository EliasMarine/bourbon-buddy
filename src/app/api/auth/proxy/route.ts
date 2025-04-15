import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// CORS headers function to ensure proper headers
function getCorsHeaders(origin: string | null) {
  // Default CORS headers
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Allow-Credentials': 'true'
  };

  // If we have an origin, use it; otherwise use * (not recommended for production)
  // For better security in production, you should validate the origin against a whitelist
  if (origin) {
    return {
      ...headers,
      'Access-Control-Allow-Origin': origin
    };
  }
  
  // Fallback for development or when origin is not available
  return {
    ...headers,
    'Access-Control-Allow-Origin': '*'
  };
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return NextResponse.json({}, { 
    status: 204,
    headers: getCorsHeaders(origin)
  });
}

/**
 * Proxy for Supabase auth sign-in
 * This route handles authentication without CORS issues
 */
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    console.log('Auth proxy request from origin:', origin);
    
    // Create a direct Supabase client (no cookies)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get request body
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    // Sign in with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Auth proxy sign-in error:', error);
      return NextResponse.json(
        { 
          error: error.message,
          code: error.code || 'unknown',
          status: error.status || 400
        },
        { status: error.status || 401, headers: getCorsHeaders(origin) }
      );
    }

    // Success response
    console.log('Auth proxy sign-in successful for:', email);
    
    return NextResponse.json(
      { 
        data,
        message: 'Authentication successful',
        timestamp: new Date().toISOString()
      },
      { status: 200, headers: getCorsHeaders(origin) }
    );
  } catch (error) {
    console.error('Error in auth proxy:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500, headers: getCorsHeaders(null) }
    );
  }
} 