# NextAuth to Supabase Auth Migration Checklist

Use this checklist to track your progress through the migration process.

| Task | Status | Notes |
|------|--------|-------|
| **Core Updates** | | |
| ✅ Update middleware.ts | Complete | Implemented correct cookie handling |
| ✅ Create new auth.ts utility | Complete | |
| ✅ Update SupabaseProvider | Complete | Removed NextAuth dependency |
| ✅ Create useSession replacement | Complete | |
| **Code Updates** | | |
| Remove NextAuth dependencies | Pending | Run: `npm uninstall next-auth @auth/core @auth/prisma-adapter` |
| Update session imports in components | Pending | Replace NextAuth imports with our custom hooks |
| Update protected route checks | Pending | |
| Update sign-in forms | Pending | |
| Update sign-up forms | Pending | |
| **Cleanup** | | |
| Remove NextAuth API routes | Pending | |
| Remove NextAuth configuration files | Pending | |
| Remove custom NextAuth-related code | Pending | |
| **Testing** | | |
| Test sign-up flow | Pending | |
| Test login flow | Pending | |
| Test logout flow | Pending | |
| Test session persistence | Pending | |
| Test protected routes | Pending | |
| Test API authentication | Pending | |
| **OAuth Providers** | | |
| Configure Google OAuth in Supabase | Pending | |
| Configure GitHub OAuth in Supabase | Pending | |
| Configure Facebook OAuth in Supabase | Pending | |
| Configure Apple OAuth in Supabase | Pending | |
| Update OAuth sign-in UI | Pending | |
| Create OAuth callback handler | Pending | |
| **Additional Features** | | |
| Implement Row Level Security (RLS) | Pending | |
| Set up password reset flow | Pending | |
| Test email verification | Pending | |
| **Documentation** | | |
| Update internal auth documentation | Pending | |
| Document new authentication flow | Pending | |

## Notes and Observations

Use this section to document any issues or observations during the migration process:

- 
- 
- 

## Resources

- [Supabase Auth Docs](https://supabase.com/docs/reference/javascript/auth-api)
- [Next.js with Supabase Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Migration Guide](./supabase-migration.md) 