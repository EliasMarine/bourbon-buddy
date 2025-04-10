# Supabase Authentication Documentation

This document provides an overview of how authentication is implemented in our application using Supabase Auth.

## Overview

Our application uses Supabase for authentication, replacing the previous NextAuth.js implementation. Supabase provides a comprehensive authentication system with features like:

- Email/password authentication
- Social OAuth providers (Google, GitHub, Facebook, Apple)
- Magic link authentication
- Row Level Security (RLS) for database access
- JWT-based session management

## Authentication Setup

### Environment Variables

The following environment variables must be set in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

### Core Components

1. **Auth Utils** (`src/lib/auth.ts`):
   - Functions for creating Supabase clients for different contexts
   - Helper functions for authentication operations (sign in, sign up, sign out)
   - Session management and user retrieval functions

2. **SupabaseProvider** (`src/components/providers/SupabaseProvider.tsx`):
   - Context provider for Supabase client
   - Session state management
   - Auth state change listener

3. **useSupabaseSession Hook** (`src/hooks/use-supabase-session.ts`):
   - Custom hook for accessing session state
   - Compatible with NextAuth's useSession API
   - Handles redirects for protected routes

4. **Middleware** (`src/middleware.ts`):
   - Protects routes based on authentication state
   - Refreshes session tokens
   - Redirects unauthenticated users to login page

## Authentication Flows

### Sign Up

1. User fills out sign-up form
2. Form submits data to Supabase Auth API
3. Supabase creates user account
4. Verification email sent to user (if email verification is enabled)
5. User verifies email by clicking link in the email
6. User is redirected to login page

### Sign In

1. User enters email and password
2. Credentials are sent to Supabase Auth API
3. If valid, Supabase returns session and user information
4. Session is stored in cookies
5. User is redirected to dashboard or requested page

### OAuth Authentication

1. User clicks on OAuth provider button (Google, GitHub, etc.)
2. User is redirected to provider's authentication page
3. After authentication, provider redirects back to our callback URL
4. Callback handler exchanges code for session
5. User is redirected to dashboard or requested page

### Sign Out

1. User clicks sign out button
2. Supabase Auth signOut API is called
3. Session is removed from cookies
4. User is redirected to login page

### Session Management

- Sessions are stored in cookies with HttpOnly flag
- Session refresh is handled by middleware
- JWT tokens are automatically refreshed when needed

## Protected Routes

Routes that require authentication are protected at two levels:

1. **Client-side**: `useSupabaseSession` hook redirects to login page if no session exists
2. **Server-side**: 
   - Middleware prevents access to protected routes
   - `requireUser` function in server components redirects if no user is found
   - API routes check for valid session before processing requests

## Row Level Security (RLS)

Supabase uses Postgres Row Level Security (RLS) to protect database access. Policies determine what data users can access. Some examples:

- Public tables: Available to all users (anon role)
- User-specific data: Only available to the authenticated user who owns the data
- Role-based access: Different access levels based on user roles

## Testing Authentication

We have implemented several test scripts to verify authentication flows:

- `npm run test:auth:quick`: Quick verification of core auth functions
- `npm run test:auth:browser`: Browser-like authentication tests
- `npm run test:auth`: Full interactive testing suite

## Additional Features

### Password Reset

To implement password reset:

```typescript
// Request password reset email
await supabase.auth.resetPasswordForEmail('user@example.com', {
  redirectTo: 'https://yourdomain.com/reset-password',
});

// Update password after reset
await supabase.auth.updateUser({
  password: 'new-password'
});
```

### Email Verification

Email verification is handled automatically by Supabase when a user signs up. The verification process can be customized in the Supabase dashboard under Authentication > Email Templates.

## Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js with Supabase Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Auth API Reference](https://supabase.com/docs/reference/javascript/auth-api) 