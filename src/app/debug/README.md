# Authentication Debugging

This debug page provides tools to troubleshoot authentication issues between NextAuth and Supabase.

## Using the Debug Page

Visit `/debug` in your browser while logged in to see the status of your authentication sessions.

## Common Issues

### Supabase Session Not Found

If you see "NextAuth: Authenticated" but "Supabase: Not authenticated", you need to sync the sessions:

1. Click the "Sync Sessions" button
2. Check that both sessions now show as authenticated
3. Verify that the "Sync Status" shows "In Sync"

### Missing Access Token

If NextAuth shows "Access Token: Missing", you may need to:

1. Log out and back in to ensure the token is properly generated
2. Check that your NextAuth configuration includes the token in the session

### Manual JWT Setup

If you continue to have issues, you may need to set up the Supabase JWT secret:

1. In your Supabase dashboard, go to Settings > API
2. Copy your JWT Secret
3. Add it to your `.env` file as `SUPABASE_JWT_SECRET=your-jwt-secret`
4. Restart your development server

## Environment Variables

Make sure you have the following environment variables set:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

## Troubleshooting Flow

1. Check NextAuth session status
2. Check Supabase session status
3. If mismatched, click "Sync Sessions"
4. If sync fails, check browser console for errors
5. Ensure all required environment variables are set
6. Try logging out and back in
7. If still not working, create a support ticket with the error details 