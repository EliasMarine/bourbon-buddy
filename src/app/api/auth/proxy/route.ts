import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isOriginAllowed, setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export function OPTIONS(req: NextRequest) {
  return handleCorsPreflightRequest(req)
}

/**
 * Proxy for Supabase auth sign-in
 * This route handles authentication without CORS issues
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url, method, body: supabaseRequestBody } = body
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      const response = NextResponse.json(
        { error: 'No authorization header' },
        { status: 401 }
      )
      setCorsHeaders(req, response)
      return response
    }
    
    // Create a direct Supabase client (no cookies)
    const supabase = createSupabaseServerClient()
    
    // Forward the request to Supabase
    const supabaseResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': authHeader,
      },
      ...(supabaseRequestBody ? { body: JSON.stringify(supabaseRequestBody) } : {}),
    })
    
    // Get the response data
    const data = await supabaseResponse.json()
    
    // Return response with proper CORS headers
    const response = NextResponse.json(data, { status: supabaseResponse.status })
    setCorsHeaders(req, response)
    return response
  } catch (error) {
    console.error('Auth proxy error:', error)
    const response = NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
    setCorsHeaders(req, response)
    return response
  }
} 