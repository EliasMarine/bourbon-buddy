# Supabase Implementation Guide for Bourbon Buddy

## Diagnostics Summary

Based on the test results, here's the status of your Supabase integration:

- **Authentication**: ✅ Working correctly
- **Database Access**:
  - **Client-side**: ⚠️ Limited by RLS policies
  - **Server-side**: ✅ Working with service role
- **Storage**: ✅ Appears to be functioning
- **Direct DB Connection**: ❌ SSL certificate issues with `pg` connections

## Implementation Recommendations

### 1. Client-Side Database Access (Browser)

Use the SSR-compatible client for client components:

```typescript
// src/utils/supabase/client.ts - Already implemented correctly
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  )
}
```

Usage in client components:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function ProfileComponent() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const supabase = createClient()
    
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          
        setProfile(data)
      }
      
      setLoading(false)
    }
    
    loadProfile()
  }, [])
  
  // Render component
}
```

### 2. Server-Side Database Access

For server components and API routes, use the server client:

```typescript
// Server Component example
import { createClient } from '@/utils/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()
  
  // Use service role client with caution - only for admin operations
  // that need to bypass RLS policies
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .limit(10)
    
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <ul>
        {users?.map(user => (
          <li key={user.id}>{user.email}</li>
        ))}
      </ul>
    </div>
  )
}
```

### 3. Authentication Flow

Your middleware.ts is correctly configured for Supabase Auth. The primary auth flow should be:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const supabase = createClient()
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      setError(error.message)
    } else {
      // The user will be redirected by middleware
      // to the appropriate page after login
    }
    
    setLoading(false)
  }
  
  // Render login form
}
```

### 4. Database Connection Issues

If you need to use direct database connections with the `pg` library:

```javascript
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required due to self-signed certificate issues
})

async function query(text, params) {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}

module.exports = { query }
```

### 5. Row-Level Security (RLS) Policies

Ensure you have appropriate RLS policies set up for tables you want to access from client-side. Example for a "profiles" table:

```sql
-- Allow users to see only their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Allow users to update only their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

### 6. Next.js Integration Tips

1. **Environment Variables**: Make sure these are set in both development and production:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=postgres://postgres:password@your-project.supabase.co:6543/postgres?sslmode=require
   ```

2. **Middleware**: Your middleware is correctly set up for auth. It properly handles token refresh and session management.

3. **Server Components**: Access Supabase in server components via:

   ```typescript
   import { createClient } from '@/utils/supabase/server'
   
   export default async function DataFetchingComponent() {
     const supabase = await createClient()
     const { data } = await supabase.from('your_table').select('*')
     
     return <div>{/* Render data */}</div>
   }
   ```

4. **Client Components**: Use the browser client in client components:

   ```typescript
   'use client'
   
   import { useEffect, useState } from 'react'
   import { createClient } from '@/utils/supabase/client'
   
   export default function ClientSideComponent() {
     const [data, setData] = useState(null)
     
     useEffect(() => {
       const supabase = createClient()
       
       // Fetch data or subscribe to realtime changes
       const fetchData = async () => {
         const { data } = await supabase.from('your_table').select('*')
         setData(data)
       }
       
       fetchData()
     }, [])
     
     return <div>{/* Render data */}</div>
   }
   ```

## Troubleshooting

If you encounter issues:

1. **Authentication Problems**:
   - Check that cookies are being properly set (inspect network tab)
   - Verify CORS settings in Supabase dashboard
   - Ensure environment variables are correct

2. **Database Access Issues**:
   - Check RLS policies for tables you're trying to access
   - Verify user permissions in Supabase dashboard
   - Use service role client for admin operations only

3. **Direct Database Connection**:
   - Always use `ssl: { rejectUnauthorized: false }` with Postgres connections
   - Consider using Supabase client instead of direct DB connections when possible

## Next Steps

1. **RLS Policies**: Review and set up appropriate RLS policies for your tables
2. **Error Handling**: Implement proper error handling for all Supabase operations
3. **Realtime**: Consider using Supabase realtime subscriptions for live updates
4. **Storage**: Set up storage policies if using Supabase storage

This guide should help ensure your Supabase integration is robust and follows best practices with Next.js. 