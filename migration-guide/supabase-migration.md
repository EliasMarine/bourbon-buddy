# Migrating from NextAuth to Supabase Auth

This guide provides step-by-step instructions for completing the migration from NextAuth.js to Supabase Auth. We've already implemented several key components to make this migration as smooth as possible.

## 🏁 What's Already Done

We've already completed several critical components for this migration:

1. ✅ Updated `middleware.ts` to use the correct Supabase cookie handling
2. ✅ Created a new `auth.ts` utility with Supabase-only helpers 
3. ✅ Updated `SupabaseProvider` to remove NextAuth dependencies
4. ✅ Created a NextAuth-compatible `useSession` hook for Supabase

## 🚀 Step 1: Update Dependencies

You can safely remove the NextAuth.js related dependencies:

```bash
npm uninstall next-auth @auth/core @auth/prisma-adapter
```

## 🔄 Step 2: Replace Session Imports

Replace all imports of `useSession`, `signIn`, and `signOut` from NextAuth with imports from our custom hooks:

```typescript
// Replace this:
import { useSession, signIn, signOut } from 'next-auth/react'

// With this:
import { useSession } from '@/hooks/use-supabase-session'
import { signOut } from '@/lib/auth' // For server actions
```

For client-side sign-in/sign-out, use the Supabase client directly:

```typescript
// Client-side sign in
const supabase = useSupabase()
await supabase.auth.signInWithPassword({
  email,
  password
})

// Client-side sign out
await supabase.auth.signOut()
```

## 🔐 Step 3: Update Protected Routes

Replace any NextAuth session checks in your pages/components:

```typescript
// Server Component - replace this:
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// With this:
import { getUser, requireUser } from '@/lib/auth'

// Then in your component:
const user = await requireUser() // Will redirect if not authenticated
```

For API routes or server actions:

```typescript
// Replace this:
const session = await getServerSession(authOptions)
if (!session) {
  return new Response('Unauthorized', { status: 401 })
}

// With this:
import { getUser } from '@/lib/auth'

const user = await getUser()
if (!user) {
  return new Response('Unauthorized', { status: 401 })
}
```

## 🔄 Step 4: Update Sign-In Forms

Update your login forms to use Supabase Auth directly:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = useSupabase()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      router.refresh()
      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message || 'Failed to log in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    // Your form JSX
  )
}
```

For server action based auth:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmailPassword } from '@/lib/auth'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await signInWithEmailPassword(email, password)

      if (!result.success) {
        throw new Error(result.error || 'Failed to log in')
      }

      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    // Your form JSX
  )
}
```

## 🧹 Step 5: Clean Up API Routes

You can remove these NextAuth API routes:
- `/pages/api/auth/[...nextauth].ts`
- `/app/api/auth/[...nextauth]/route.ts`
- Any custom NextAuth endpoints

## 🔄 Step 6: Update Redirects

If you have any redirects using NextAuth's signIn function with callbackUrl:

```typescript
// Replace this:
import { signIn } from 'next-auth/react'
signIn(undefined, { callbackUrl: '/dashboard' })

// With this:
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/login?callbackUrl=/dashboard')
```

## 🔍 Step 7: Testing

Thoroughly test all authentication flows:

1. Sign up
2. Log in 
3. Log out
4. Password reset
5. Protected route access
6. API access with authentication

## 📋 OAuth Provider Migration

If you're using OAuth providers (Google, GitHub, etc.):

1. Configure the providers in the Supabase dashboard
2. Update your sign-in UI to use Supabase's OAuth:

```typescript
// Sign in with OAuth provider
await supabase.auth.signInWithOAuth({
  provider: 'google', // or 'github', 'facebook', etc.
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})
```

3. Create a callback handler:

```typescript
// app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // URL to redirect to after sign in
  return NextResponse.redirect(requestUrl.origin)
}
```

## 🔐 Additional Features

### 1. Row Level Security (RLS)

Implement Supabase RLS policies to protect your data at the database level:

```sql
-- Example RLS policy for a 'notes' table
CREATE POLICY "Users can only see their own notes"
ON notes
FOR SELECT
USING (auth.uid() = user_id);
```

### 2. Password Reset

```typescript
// Request password reset
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`
})

// Update password after reset
const { error } = await supabase.auth.updateUser({
  password: newPassword
})
```

## 🚨 Common Issues

1. **Session not persisting**: Make sure all cookie handling is using the new pattern with `getAll` and `setAll`.

2. **CORS errors**: Double-check site URL configuration in Supabase dashboard.

3. **Redirect loops**: Ensure you're not redirecting to login page when already on login page.

## 📚 Resources

- [Supabase Auth Docs](https://supabase.com/docs/reference/javascript/auth-api)
- [Next.js Server Components with Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

## 🗑️ Final Cleanup

Once everything is working, you can safely remove these files:

- `src/pages/api/auth/` directory
- NextAuth configuration files
- Next-Auth specific middleware or utilities

---

Remember to test thoroughly between each step. This migration approach allows for incremental updates while maintaining a functioning application throughout the process. 