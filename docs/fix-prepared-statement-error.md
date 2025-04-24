# Fixing the "Prepared Statement s0 Already Exists" Error

This document explains how to fix the PostgreSQL error `prepared statement "s0" already exists` that can occur when using Prisma with Supabase.

## The Problem

The error typically looks like this:

```
Error occurred during query execution:
ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "42P05", message: "prepared statement \"s0\" already exists", severity: "ERROR", detail: None, column: None, hint: None }), transient: false })
```

This error occurs because:

1. Prisma uses prepared statements for database queries
2. Supabase uses connection pooling via PgBouncer
3. When multiple Prisma clients share the same connection from the pool, they can attempt to create prepared statements with the same name

## The Solution

We've implemented several fixes to resolve this issue:

### 1. Added Connection Pooling Parameters to Your DATABASE_URL

We've created a script that will automatically add the necessary parameters to your Supabase connection string:

```bash
node scripts/fix-supabase-connection.js
```

The script will add the following parameters to your DATABASE_URL:
- `pgbouncer=true`: Tells Prisma to use a connection pooling compatible mode
- `connection_limit=1`: Limits the connections per client
- `pool_timeout=10`: Sets a timeout for connection pooling

### 2. Enhanced Prisma Client Error Recovery

We've also updated the Prisma client configuration in `src/lib/prisma.ts` to:

- Detect prepared statement errors (code 42P05)
- Automatically deallocate existing prepared statements
- Reconnect to the database
- Retry the operation when possible

### 3. Deallocate Statements on Startup

We've added a middleware to the Prisma client that automatically deallocates all prepared statements at the beginning of database operations, which helps prevent conflicts.

## How to Apply These Fixes

1. **Run the fix script**:
   ```bash
   node scripts/fix-supabase-connection.js
   ```

2. **Restart your development server**:
   ```bash
   npm run dev:realtime
   ```

3. **Try your upload again**. The error should now be resolved.

## Manual Fix (If Script Doesn't Work)

If the script doesn't work, you can manually fix the issue:

1. Open your `.env.local` file
2. Find the `DATABASE_URL` line
3. Modify it to add the PgBouncer parameters:

```
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:5432/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10"
```

## Troubleshooting

If you continue to experience issues:

1. Check the logs for specific error messages
2. Try reconnecting to the database by restarting your server
3. As a last resort, you can try using the `DIRECT_DATABASE_URL` instead of `DATABASE_URL`

For more information, see the [Prisma documentation on connection pooling](https://www.prisma.io/docs/guides/connection-management/configure-pg-bouncer) and [Supabase documentation on using Prisma](https://supabase.com/docs/guides/integrations/prisma). 