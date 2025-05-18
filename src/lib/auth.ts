import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'

/**
 * Creates a Supabase client for client-side browser usage
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Creates a Supabase client for server components
 */
export async function createServerComponentClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase client for server actions
 */
export async function createActionClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

/**
 * Creates a Supabase client for middleware
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  
  return { supabase, response }
}

/**
 * Checks if the user is authenticated in server components
 * Redirects to login if not authenticated and redirectIfUnauthorized is true
 */
export async function requireUser({ redirectIfUnauthorized = true }: { redirectIfUnauthorized?: boolean } = {}) {
  const supabase = await createServerComponentClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user && redirectIfUnauthorized) {
    redirect('/login')
  }
  
  return user
}

/**
 * Gets the current user in a server component
 */
export async function getUser() {
  const supabase = await createServerComponentClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  return user
}

/**
 * Gets the current session in a server component
 */
export async function getSession() {
  const supabase = await createServerComponentClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  return session
}

/**
 * Helper function to sign out the user in server actions
 */
export async function signOut() {
  'use server'
  
  const supabase = await createActionClient()
  
  await supabase.auth.signOut()
  redirect('/login')
}

/**
 * Helper function to sign in with email/password in server actions
 */
export async function signInWithEmailPassword(email: string, password: string) {
  'use server'
  
  const supabase = await createActionClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

/**
 * Helper function to sign up with email/password in server actions
 */
export async function signUpWithEmailPassword(email: string, password: string) {
  'use server'
  
  const supabase = await createActionClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

/**
 * Helper function to clean auth cookies in responses
 */
export function cleanupAuthCookies(response: Response) {
  const cookiesToClear = [
    'sb-access-token',
    'sb-refresh-token'
  ]
  
  const cleanedResponse = new Response(response.body, response)
  
  cookiesToClear.forEach(name => {
    cleanedResponse.headers.append('Set-Cookie', 
      `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; ${
        process.env.NODE_ENV === 'production' ? 'Secure; ' : ''
      }expires=Thu, 01 Jan 1970 00:00:00 GMT`
    )
  })
  
  return cleanedResponse
}

export async function getServerSession() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return null;
  }

  // Add the id property to match the expected structure
  return {
    user: {
      ...data.user,
      id: data.user.id
    }
  };
} 