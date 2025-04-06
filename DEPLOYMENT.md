# Deploying Bourbon Buddy to Vercel

This guide walks you through deploying the Bourbon Buddy application to Vercel.

## Prerequisites

1. A Vercel account
2. A PostgreSQL database (Vercel Postgres recommended)
3. OAuth provider accounts (Google, GitHub, Apple)
4. AWS S3 bucket for file uploads

## Step 1: Database Setup

1. Create a new PostgreSQL database:
   - Option 1: Use Vercel Postgres
     - Go to your Vercel dashboard
     - Click "Storage"
     - Create a new Postgres database
     - Copy the connection string
   - Option 2: Use another provider (Supabase, Railway, etc.)

2. Run database migrations:
   ```bash
   DATABASE_URL=your_production_db_url npx prisma migrate deploy
   ```

## Step 2: Environment Variables

Set the following in your Vercel project settings:

1. Database:
   ```
   DATABASE_URL=your_production_db_url
   ```

2. NextAuth:
   ```
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=generate_a_secure_random_string
   ```

3. OAuth Providers:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   APPLE_CLIENT_ID=your_apple_client_id
   APPLE_CLIENT_SECRET=your_apple_client_secret
   ```

4. AWS S3:
   ```
   AWS_REGION=your_aws_region
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_BUCKET_NAME=your_bucket_name
   ```

## Step 3: OAuth Provider Setup

Update OAuth callback URLs in each provider's dashboard:

1. Google Cloud Console:
   - Add: `https://your-domain.vercel.app/api/auth/callback/google`

2. GitHub Developer Settings:
   - Add: `https://your-domain.vercel.app/api/auth/callback/github`

3. Apple Developer Account:
   - Add: `https://your-domain.vercel.app/api/auth/callback/apple`

## Step 4: AWS S3 Setup

1. Update CORS configuration in your S3 bucket:
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["https://your-domain.vercel.app"],
         "AllowedHeaders": ["*"],
         "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
         "MaxAgeSeconds": 3000
       }
     ]
   }
   ```

## Step 5: Deployment

1. Connect your GitHub repository to Vercel:
   - Go to vercel.com/new
   - Import your repository
   - Select "Next.js" as the framework

2. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. Deploy:
   - Click "Deploy"
   - Wait for the build to complete

## Post-Deployment

1. Verify OAuth logins work
2. Test file uploads
3. Check database connections
4. Monitor error logs in Vercel dashboard

## Troubleshooting

Common issues and solutions:

1. Database Connection Issues:
   - Verify DATABASE_URL is correct
   - Check if IP is whitelisted in database provider

2. OAuth Errors:
   - Verify callback URLs are correct
   - Check environment variables are set

3. File Upload Issues:
   - Verify S3 CORS configuration
   - Check AWS credentials

4. Build Errors:
   - Check Vercel build logs
   - Verify all dependencies are installed

## Monitoring

1. Set up monitoring in Vercel dashboard
2. Configure error alerts
3. Monitor database performance
4. Track S3 usage

For additional help, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Prisma Documentation](https://www.prisma.io/docs) 