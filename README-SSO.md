# Setting Up SSO for Bourbon Buddy

This document provides instructions for setting up Single Sign-On (SSO) with Google, Apple, and GitHub for your Bourbon Buddy application.

## Prerequisites

Before you begin, ensure you have the following:
- A Bourbon Buddy application running on Next.js
- Administrator access to Google Cloud Console, Apple Developer Account, and GitHub account

## Environment Variables

The following environment variables need to be set in your `.env.local` file:

```
# OAuth Providers
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
APPLE_CLIENT_ID=""
APPLE_CLIENT_SECRET=""
```

## Setting Up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application"
6. Enter a name for your application
7. Add authorized JavaScript origins: `http://localhost:3000` (for development) and your production URL
8. Add authorized redirect URIs: 
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://yourdomain.com/api/auth/callback/google` (for production)
9. Click "Create"
10. Copy the Client ID and Client Secret and add them to your `.env.local` file

## Setting Up GitHub OAuth

1. Go to your [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Enter your application name
4. Enter your homepage URL (e.g., `http://localhost:3000` for development or your production URL)
5. For the Authorization callback URL, enter:
   - `http://localhost:3000/api/auth/callback/github` (for development)
   - `https://yourdomain.com/api/auth/callback/github` (for production)
6. Click "Register application"
7. Copy the Client ID
8. Generate a new Client Secret and copy it
9. Add both to your `.env.local` file

## Setting Up Apple OAuth

Setting up Apple OAuth is more complex:

1. Go to the [Apple Developer Portal](https://developer.apple.com/)
2. Sign in with your Apple Developer account
3. Go to "Certificates, Identifiers & Profiles"
4. Under "Identifiers", add a new identifier
5. Select "App IDs" and click "Continue"
6. Provide a description and Bundle ID (e.g., `com.yourdomain.bourbonbuddy`)
7. Under "Capabilities", check "Sign In with Apple" and click "Configure"
8. Add your domain and return URLs and click "Save"
9. Go back to "Certificates, Identifiers & Profiles"
10. Under "Identifiers", add a new identifier
11. This time, select "Services IDs" and click "Continue"
12. Provide a description and identifier (e.g., `com.yourdomain.bourbonbuddy.service`)
13. Check "Sign In with Apple" and click "Configure"
14. Select the App ID you created earlier
15. Add the following domains:
    - `localhost` (for development)
    - `yourdomain.com` (for production)
16. Add the following return URLs:
    - `http://localhost:3000/api/auth/callback/apple` (for development)
    - `https://yourdomain.com/api/auth/callback/apple` (for production)
17. Go to "Keys" and add a new key
18. Provide a name, check "Sign In with Apple", and click "Configure"
19. Select the primary App ID you created earlier and click "Save"
20. Download the key and note the Key ID
21. Use the following values in your `.env.local` file:
    - `APPLE_CLIENT_ID`: Your Services ID identifier
    - `APPLE_CLIENT_SECRET`: A JWT token that you need to generate using your key, Key ID, and Team ID

## Database Setup

The application uses Prisma ORM for database management. Make sure to run the database migrations to create the required tables for OAuth:

```bash
npx prisma migrate dev --name add_oauth_support
```

## Testing SSO

After configuring all providers, you can test the SSO functionality by:

1. Starting your application: `npm run dev`
2. Navigating to the login page and clicking on the SSO buttons

## Troubleshooting

If you encounter issues:
1. Check the console logs for any errors
2. Verify that your environment variables are set correctly
3. Ensure that your redirect URIs match exactly what you've configured with the providers
4. Confirm that your database migrations have been applied correctly 