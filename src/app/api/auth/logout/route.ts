import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'
import { validateCsrfToken } from '@/lib/csrf'

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req)
}

/**
 * Logout endpoint for Supabase authentication
 * This route proxies logout requests to avoid CORS issues with Firefox
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Logout endpoint called')
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the Supabase URL and project ID for specific cookie patterns
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || ''
    
    // First, perform Supabase signOut
    await supabase.auth.signOut({ scope: 'global' })
    console.log('Supabase auth.signOut called with global scope')
    
    // Prepare response with proper headers
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    )
    
    // Set CORS headers using the utility function
    setCorsHeaders(req, response)
    
    // Aggressively clear all possible Supabase-related cookies
    const cookieNames = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-provider-token',
      'supabase-auth-token',
      '__session',
      'sb-pkce-verifier',
      `sb-${projectId}-auth-token`,
      'auth',
      'token',
      'session',
      'sb:token',
      'sb:session',
      'auth-token',
      'refresh-token',
      // Add any other potential cookie names
    ]
    
    // Define potential domains based on environment
    const domainsToTry = [
      process.env.NODE_ENV === 'production' ? '.bourbonbuddy.live' : undefined, // Main domain with dot
      process.env.NODE_ENV === 'production' ? 'bourbonbuddy.live' : undefined,  // Without dot
      'localhost',
      undefined // Let browser handle default
    ].filter(Boolean) as string[];
    
    // Define potential paths
    const pathsToTry = ['/', '/api', '/api/auth', ''];
    
    // Super aggressive cookie clearing - try all combinations
    for (const name of cookieNames) {
      for (const domain of domainsToTry) {
        for (const path of pathsToTry) {
          response.cookies.set({
            name,
            value: '',
            expires: new Date(0),
            path: path || '/',
            ...(domain ? { domain } : {}),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          });
        }
      }
      
      // Also try with the delete approach
      for (const domain of domainsToTry) {
        for (const path of pathsToTry) {
          try {
            response.cookies.delete({ 
              name,
              ...(path ? { path } : {}), 
              ...(domain ? { domain } : {})
            });
          } catch (e) {
            // Ignore errors from delete attempts, we're being aggressive
          }
        }
      }
    }
    
    console.log('Server-side logout successful')
    return response
  } catch (error) {
    console.error('Server-side logout error:', error)
    
    // Create error response
    const response = NextResponse.json(
      { success: false, error: 'Failed to log out' },
      { status: 500 }
    )
    
    // Set CORS headers on error response too
    setCorsHeaders(req, response)
    
    return response
  }
} 