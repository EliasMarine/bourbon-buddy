import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
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
 * Uses the correct Supabase SSR cookie pattern for bulletproof session cleanup
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Logout endpoint called')

    // Create a server-side Supabase client using the SSR pattern
    // This ensures cookies are handled with getAll/setAll only
    const supabase = await createSupabaseServerClient()

    // Perform Supabase signOut (global scope for all devices)
    await supabase.auth.signOut({ scope: 'global' })
    console.log('Supabase auth.signOut called with global scope')

    // Prepare a clean JSON response
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    )

    // Set CORS headers using the utility function
    setCorsHeaders(req, response)

    // Note: Supabase SSR client will handle cookie cleanup via setAll internally
    // No need for manual response.cookies.set or .delete calls
    // This ensures compliance with Supabase SSR best practices and avoids session leaks

    console.log('Server-side logout successful (SSR pattern)')
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