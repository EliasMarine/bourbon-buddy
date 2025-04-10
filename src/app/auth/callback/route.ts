import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Auth callback handler for Supabase OAuth
 * This route handles the callback after a user signs in with an OAuth provider (Google, GitHub, etc.)
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const callbackUrl = requestUrl.searchParams.get('callbackUrl') || '/dashboard'
  
  // For debugging/logging purposes
  console.log('Auth callback received:', {
    url: request.url,
    hasCode: !!code, 
    callbackUrl,
    origin: requestUrl.origin,
    hostname: requestUrl.hostname
  })
  
  // Create a response to the destination URL
  const redirectUrl = new URL(callbackUrl, requestUrl.origin)
  const response = NextResponse.redirect(redirectUrl)
  
  if (code) {
    try {
      // Create a Supabase client using the authorization code
      // This uses the same cookie handling pattern from middleware.ts
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                request.cookies.set(name, value)
                response.cookies.set(name, value, options)
              })
            }
          },
        }
      )
      
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Exchange code error:', error)
        // Redirect to login with error message
        const errorUrl = new URL('/login', requestUrl.origin)
        errorUrl.searchParams.set('error', 'authentication_error')
        return NextResponse.redirect(errorUrl)
      }
      
      if (data?.session) {
        console.log('OAuth sign-in successful, redirecting to:', callbackUrl)
      }
    } catch (error) {
      console.error('Exception during code exchange:', error)
      const errorUrl = new URL('/login', requestUrl.origin)
      errorUrl.searchParams.set('error', 'unknown_error')
      return NextResponse.redirect(errorUrl)
    }
  } else {
    console.warn('Auth callback received without code')
  }
  
  return response
} 