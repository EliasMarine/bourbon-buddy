import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
// Removed authOptions import - not needed with Supabase Auth;
import { createServerClient } from '@supabase/ssr';
import { getCsrfCookieName } from '@/lib/csrf';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors';

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req);
}

/**
 * Debug endpoint for Supabase authentication
 * This route helps identify CORS and auth issues
 */
export async function GET(req: NextRequest) {
  try {
    // Create a response with CORS debugging info
    const response = NextResponse.json({
      message: 'Auth debug endpoint working',
      cors: {
        headers: Object.fromEntries(req.headers.entries()),
        origin: req.headers.get('origin'),
        referer: req.headers.get('referer'),
        host: req.headers.get('host'),
      },
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        nodeEnv: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString()
    });
    
    // Set CORS headers
    setCorsHeaders(req, response);
    return response;
  } catch (error) {
    console.error('Debug endpoint error:', error);
    const response = NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
    setCorsHeaders(req, response);
    return response;
  }
} 