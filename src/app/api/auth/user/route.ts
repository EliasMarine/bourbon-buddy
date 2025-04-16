import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors';

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req);
}

export async function GET(request: NextRequest) {
  try {
    console.log('Auth user proxy endpoint called');
    
    // Extract the Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('No Authorization header provided');
      const response = NextResponse.json(
        { error: 'No Authorization header provided' },
        { status: 401 }
      );
      setCorsHeaders(request, response);
      return response;
    }
    
    // Forward the request to Supabase directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('Supabase URL not configured');
      const response = NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
      setCorsHeaders(request, response);
      return response;
    }
    
    console.log('Forwarding user request to Supabase');
    
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`Supabase user response error: ${response.status} ${response.statusText}`);
      
      // Forward the error status
      const errorResponse = NextResponse.json(
        { error: 'Authentication error' },
        { status: response.status }
      );
      setCorsHeaders(request, errorResponse);
      return errorResponse;
    }
    
    const data = await response.json();
    console.log('Successfully retrieved user data from Supabase');
    
    // Return the data from Supabase
    const successResponse = NextResponse.json(data);
    setCorsHeaders(request, successResponse);
    return successResponse;
  } catch (error) {
    console.error('Error in user proxy endpoint:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    setCorsHeaders(request, response);
    return response;
  }
} 