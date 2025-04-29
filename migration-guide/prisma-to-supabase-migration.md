# Prisma to Supabase Migration Guide

This guide outlines the process for migrating the codebase from Prisma to Supabase.

## Migration Steps

### 1. Set up Supabase Client

Create a central utility file for Supabase interactions:

```typescript
// src/lib/supabase.ts
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { cache } from 'react';

// Database schema type definitions
export type Database = {
  public: {
    Tables: {
      User: { Row: any; Insert: any; Update: any },
      Spirit: { Row: any; Insert: any; Update: any },
      // ... other tables
    }
  }
}

// Create browser client (client-side)
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Create server client (server components)
export const createServerSupabaseClient = cache(() => {
  const cookieStore = cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        }
      }
    }
  );
});

// Direct client (server-side only, not for components)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Additional helper functions here...

export default supabase;
```

### 2. Install Required Dependencies

```bash
npm uninstall @prisma/client prisma
npm install @supabase/ssr @supabase/supabase-js
```

### 3. Update Middleware

Create or update your middleware file:

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not add code here. 
  // A simple mistake could make it very hard to debug issues
  // with users being randomly logged out.

  const { data } = await supabase.auth.getUser();
  const { user } = data;

  // Route protection or redirection logic here...

  return response;
}
```

### 4. Migration Patterns for Common Operations

| Prisma | Supabase |
| ------ | -------- |
| `prisma.user.findUnique({ where: { id } })` | `supabase.from('User').select('*').eq('id', id).single()` |
| `prisma.user.findMany({ where: { age: { gte: 18 } } })` | `supabase.from('User').select('*').gte('age', 18)` |
| `prisma.user.create({ data: {...} })` | `supabase.from('User').insert({...}).select('*').single()` |
| `prisma.user.update({ where: { id }, data: {...} })` | `supabase.from('User').update({...}).eq('id', id).select('*').single()` |
| `prisma.user.delete({ where: { id } })` | `supabase.from('User').delete().eq('id', id)` |
| `prisma.user.count({ where: {...} })` | `supabase.from('User').select('*', { count: 'exact', head: true })` |
| `prisma.user.findMany({ include: { posts: true } })` | `supabase.from('User').select('*, posts:Post(*)')` |
| `prisma.$transaction([...])` | Use multiple operations with error handling |

### 5. Replace Prisma Queries in Files

Replace Prisma code with Supabase code throughout your codebase:

#### Example 1: Simple find operation

```typescript
// Before (Prisma)
const user = await prisma.user.findUnique({
  where: { email: userEmail },
  select: { id: true, name: true }
});

// After (Supabase)
const { data: user, error } = await supabase
  .from('User')
  .select('id, name')
  .eq('email', userEmail)
  .single();
  
if (error) throw error;
```

#### Example 2: Create operation with relations

```typescript
// Before (Prisma)
const post = await prisma.post.create({
  data: {
    title,
    content,
    userId,
  },
  include: {
    user: true
  }
});

// After (Supabase)
const { data: post, error } = await supabase
  .from('Post')
  .insert({ title, content, userId })
  .select(`
    *,
    user:User(*)
  `)
  .single();
  
if (error) throw error;
```

#### Example 3: Update operation

```typescript
// Before (Prisma)
const updatedUser = await prisma.user.update({
  where: { id },
  data: { name, bio }
});

// After (Supabase)
const { data: updatedUser, error } = await supabase
  .from('User')
  .update({ name, bio })
  .eq('id', id)
  .select()
  .single();
  
if (error) throw error;
```

#### Example 4: Delete operation

```typescript
// Before (Prisma)
const deleted = await prisma.post.delete({
  where: { id }
});

// After (Supabase)
const { error } = await supabase
  .from('Post')
  .delete()
  .eq('id', id);
  
if (error) throw error;
```

#### Example 5: Complex queries

```typescript
// Before (Prisma)
const posts = await prisma.post.findMany({
  where: {
    OR: [
      { published: true },
      { authorId: userId }
    ]
  },
  include: {
    author: {
      select: {
        name: true,
        image: true
      }
    },
    comments: {
      where: {
        approved: true
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    }
  },
  take: 10,
  skip: page * 10,
  orderBy: {
    createdAt: 'desc'
  }
});

// After (Supabase)
// This may require multiple queries for complex operations
const { data: posts, error } = await supabase
  .from('Post')
  .select(`
    *,
    author:User(name, image),
    comments:Comment(*)
  `)
  .or(`published.eq.true, authorId.eq.${userId}`)
  .eq('comments.approved', true)
  .order('createdAt', { ascending: false })
  .range(page * 10, page * 10 + 9);

// You'll need to post-process the results for some operations like
// limiting the number of comments per post
const postsWithLimitedComments = posts?.map(post => ({
  ...post,
  comments: post.comments
    .filter(comment => comment.approved)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
}));
```

### 6. Clean Up Prisma Files

- Delete the `prisma/` directory and all migration files
- Remove `prisma` and `@prisma/client` from `package.json`
- Delete any database seeding scripts that use Prisma

### 7. Testing the Migration

1. Test each converted endpoint with actual data
2. Verify authentication flows that may have been using Prisma
3. Test complex queries and relationships 
4. Check performance of converted queries

### 8. Common Challenges and Solutions

1. **Complex Joins**: Supabase may need multiple queries for complex joins or recursive relationships
2. **Transactions**: Supabase doesn't support multi-table transactions directly; use error handling and rollback logic
3. **Aggregations**: Some Prisma aggregations need to be done in code or using PostgreSQL functions
4. **Pagination**: Use Supabase's `range()` method instead of `skip`/`take`
5. **Raw SQL**: For very complex queries, use `supabase.rpc()` to call PostgreSQL functions

## Additional Resources

- [Supabase JavaScript Documentation](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase PostgreSQL Features](https://supabase.com/docs/guides/database/overview)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) 