import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
// Removed authOptions import - not needed with Supabase Auth;
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors';

// Maximum age for the JWT token (in seconds)
const MAX_AGE = 60 * 60 * 24 * 7; // 1 week

// Helper to generate debug ID for logs
const generateDebugId = () => Math.random().toString(36).substring(2, 8);

interface SupabaseUser {
  id: string;
  email?: string;
  [key: string]: any;
}

/**
 * Handle OPTIONS requests (CORS preflight)
 * Safari needs a 200 response with proper CORS headers
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req);
}

/**
 * Session endpoint for Supabase authentication
 * This route proxies session refresh requests to avoid CORS issues in browsers
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Session refresh proxy request received');
    const body = await req.json();
    const { refresh_token } = body;
    
    if (!refresh_token) {
      console.error('No refresh token provided');
      const response = NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    console.log('Creating Supabase server client for session refresh');
    // Create a direct Supabase client
    const supabase = createSupabaseServerClient();
    
    // Log information about the refresh token (first 5 chars only for security)
    const tokenPreview = refresh_token.substring(0, 5) + '...';
    console.log(`Attempting to refresh session with token: ${tokenPreview}`);
    
    // Handle session refresh on the server side
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });
    
    if (error) {
      console.error('Session refresh error:', error.message, error.stack);
      const response = NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
      setCorsHeaders(req, response);
      return response;
    }
    
    console.log('Session refresh successful, returning new session data');
    
    // Return the session data with proper CORS headers
    const response = NextResponse.json({
      access_token: data.session.access_token,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: data.session.refresh_token,
      user: data.user
    });
    setCorsHeaders(req, response);
    return response;
  } catch (error) {
    console.error('Session refresh critical error:', error);
    const response = NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
    setCorsHeaders(req, response);
    return response;
  }
} 