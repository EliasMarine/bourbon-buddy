# 🥃 Bourbon Buddy

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.5.0-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-010101?style=flat&logo=socket.io)](https://socket.io/)
[![Supabase](https://img.shields.io/badge/Supabase-2.49.4-181818?style=flat&logo=supabase)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-Latest-DC382D?style=flat&logo=redis)](https://redis.io/)
[![MUX](https://img.shields.io/badge/MUX-Video-FF9A00?style=flat&logo=mux)](https://mux.com/)

A modern web application for spirits enthusiasts to catalog, rate, and share their collection. Built with real-time features for an interactive experience.

## ✨ Features

### 🗃️ Collection Management
- Add spirits to your personal collection
- Track bottle levels and inventory
- Detailed spirit information and metadata
- Search functionality with royalty-free images

### 👥 Social Features
- Rate and review spirits
- Add detailed tasting notes
- Share your collection with others
- Real-time chat system

### 🎥 Video & Streaming
- MUX-powered video uploads and playback
- WebRTC-powered live streaming
- Peer-to-peer video communication
- Real-time interaction during tastings
- Low-latency performance

### 🔒 Security & Authentication
- Secure user authentication
- Protected routes and API endpoints
- Rate limiting with Redis
- DDoS protection
- Database backup and recovery systems

## 🛠️ Tech Stack

- **Frontend**
  - Next.js 15.2.4
  - TypeScript 5.3.3
  - Tailwind CSS 3.4.1
  - Framer Motion for animations
  - React Hook Form for form handling
  - Zod for validation

- **Backend**
  - Node.js 22.x
  - Supabase for backend services
  - Socket.IO for real-time features
  - WebRTC for streaming
  - Express for API routes

- **Database & Storage**
  - Supabase PostgreSQL database
  - Redis for caching and session management
  - MUX for video processing and delivery
  - Supabase Storage for media files
  - Automated backup system

## 🚀 Getting Started

### Prerequisites
- Node.js 22.x
- npm or yarn
- Supabase account and project
- Redis instance (local or cloud)
- MUX account (for video features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bourbon-buddy.git
cd bourbon-buddy
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Edit `.env.local` with your configuration for Supabase, Redis, and MUX.

4. Initialize the database:
```bash
npm run db:migrate
npm run seed
```

### Development

The application has two development modes:

1. **Standard Mode** (for static features):
```bash
npm run dev
```

2. **Real-time Mode** (for streaming, chat, and video):
```bash
npm run dev:realtime
```

Access the application at [http://localhost:3000](http://localhost:3000)

### Production Deployment

```bash
npm run build
npm run start
```

### Vercel Deployment

To deploy successfully on Vercel and prevent Prisma prepared statement conflicts:

1. Configure the following environment variables on Vercel:

```
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>?pgbouncer=true&connection_limit=1&pool_timeout=10
DIRECT_DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>
SHADOW_DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<shadow_database>
REDIS_URL=redis://<username>:<password>@<host>:<port>
MUX_TOKEN_ID=<your-mux-token-id>
MUX_TOKEN_SECRET=<your-mux-token-secret>
MUX_WEBHOOK_SECRET=<your-mux-webhook-secret>
```

2. Ensure your build command uses `prisma generate`:

```
"vercel-build": "prisma generate && next build",
```

3. For Serverless deployment with Prisma, it's important to:
   - Use connection pooling (PgBouncer recommended)
   - Set appropriate connection limits
   - Generate Prisma client during each build
   
4. If you continue to experience "prepared statement already exists" errors, try:
   - Increase connection pool timeouts
   - Configure Prisma's datasource to use a lower connection limit
   - Add pooler configuration to your DATABASE_URL

### Troubleshooting Deployment

#### DATABASE_URL Issues

If you encounter the following error during deployment:

```
Error: DATABASE_URL is using the default Supabase pooler URL. Please set the correct database URL from your environment variables.
```

This indicates that the deployment is using the default Supabase pooler URL with placeholder credentials. To fix this:

1. **Check your environment variables** in the Vercel dashboard:
   - Go to your project in the Vercel dashboard
   - Navigate to Settings > Environment Variables
   - Verify that `DATABASE_URL` is properly set with actual credentials
   - Make sure `DATABASE_URL` doesn't contain placeholder values like `postgres:postgres` or `default_password`
   
2. **Set up fallback database URLs**:
   - Add `DIRECT_DATABASE_URL` as a backup connection string
   - This should point directly to your database without pooler configuration

3. **Run the fix script manually**:
   ```bash
   npm run fix-db
   ```
   
4. **For Supabase users**:
   - Avoid using the default pooler URL from Supabase
   - Get the correct connection string from Supabase Dashboard > Project Settings > Database
   - Use the "Connection string" with your actual password
   - For production, use the "Connection pooling" string with your actual password

5. **Restart the deployment** after fixing the environment variables.

The application includes a validation system that prevents it from starting with incorrect database URLs to protect against connection issues and data loss.

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [Database Protection](DATABASE-PROTECTION.md)
- [Socket Troubleshooting](SOCKET-TROUBLESHOOTING.md)
- [SSO Configuration](README-SSO.md)

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run dev:realtime` - Start development server with real-time features
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:backup` - Create database backup
- `npm run db:restore` - Restore database from backup
- `npm run db:verify` - Verify database integrity
- `npm run db:migrate` - Run database migrations
- `npm run deploy` - Deploy to production

## 📦 Core Integrations

### Redis Integration

Redis is used for several critical functions in the application:

- **Session Management**: Secure, server-side session storage
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **Caching**: Performance optimization for frequently accessed data
- **Pub/Sub**: Used for real-time notifications and events
- **Job Queues**: Background processing tasks

#### Configuration

Configure Redis by adding the following to your environment:

```
REDIS_URL=redis://username:password@host:port
REDIS_PREFIX=bourbon_buddy_
```

#### Usage Examples

```typescript
// Sessions
import { redis } from '@/lib/redis'

// Store session data
await redis.set(`session:${sessionId}`, JSON.stringify(sessionData), 'EX', 3600)

// Retrieve session data
const session = await redis.get(`session:${sessionId}`)

// Rate limiting
const attempts = await redis.incr(`ratelimit:${ip}`)
if (attempts > MAX_ATTEMPTS) {
  // Rate limit exceeded
}
```

### MUX Video Integration

MUX provides powerful video infrastructure for:

- Direct browser uploads
- Video transcoding and optimization
- Adaptive streaming (HLS)
- Thumbnail generation
- Video analytics

#### Configuration

1. Create a MUX account at [mux.com](https://www.mux.com)
2. Generate API access tokens in the MUX dashboard
3. Add the following to your environment:

```
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret
MUX_WEBHOOK_SECRET=your-mux-webhook-secret
```

#### Video Upload

```typescript
// Server-side
import { muxClient } from '@/lib/mux'

const upload = await muxClient.video.uploads.create({
  cors_origin: 'https://yourdomain.com',
  new_asset_settings: {
    playback_policy: ['public'],
  }
})

// Client-side component
import MuxUploaderReact from '@mux/mux-uploader-react'

<MuxUploaderReact 
  endpoint={uploadUrl} 
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

#### Video Playback

```tsx
import { MuxPlayer } from '@/components/ui/mux-player'

<MuxPlayer 
  playbackId="your-playback-id" 
  accentColor="#3b82f6"
  metadataVideoTitle="My Video Title"
/>
```

#### Webhooks

Set up a webhook endpoint in the MUX dashboard to `https://yourdomain.com/api/webhooks/mux`

This handles video processing events:
- `video.asset.ready` - Video ready for playback
- `video.asset.errored` - Processing error
- `video.upload.asset_created` - Upload complete

## 📜 License

Custom Personal IP Non-Commercial Use License v1.0  
This project is the intellectual property of Elias Bou Zeid.  
**Non-commercial use only**. Contact bourbonbuddy@bitspec.co for commercial licensing.

## 🤝 Contributing

While this is a personal project, suggestions and feedback are welcome. Please open an issue to discuss potential improvements or report bugs.

## 📞 Support

For support, please contact bourbonbuddy@bitspec.co

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.local.example` to `.env.local` and add your API keys:
   ```
   SERPAPI_KEY=your_serpapi_key_here
   ```
4. Run the development server: `npm run dev`
5. Open http://localhost:3000 to view the app

## Environment Variables

- `SERPAPI_KEY`: Your SerpApi key for web searches. Get one at [SerpApi](https://serpapi.com/).

## Getting a SerpApi Key

1. Visit [SerpApi](https://serpapi.com/) and create an account
2. Navigate to your dashboard to find your API key
3. Add the key to your `.env.local` file

## Web Search Integration

The application integrates with SerpApi to fetch accurate information about spirits, including:

- Distillery details (name, location, history)
- Bottle information (price range, ratings, awards)
- Tasting notes
- Related articles and reviews

# MUX Signed Video Implementation

This project demonstrates how to implement secure video playback using MUX signed playback URLs with JWT tokens.

## Overview

[MUX](https://mux.com/) is a video API platform that provides video hosting, streaming, and playback services. 
This implementation shows how to:

1. Create MUX assets with the "signed" playback policy
2. Generate JWT tokens for secure video access
3. Create signed playback URLs that require valid tokens
4. Display videos using these secure signed URLs
5. Properly manage assets using both asset IDs and playback IDs

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MUX account with API credentials
- MUX signing key for JWT token generation

### Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```
MUX_TOKEN_ID=your_mux_api_token_id
MUX_TOKEN_SECRET=your_mux_api_token_secret
MUX_SIGNING_KEY_ID=your_mux_signing_key_id
MUX_PRIVATE_KEY=your_mux_private_key
MUX_WEBHOOK_SECRET=your_mux_webhook_secret
```

### MUX Configuration Steps

1. **Create a MUX Account**
   - Sign up at [mux.com](https://mux.com/)
   - Create an API access token (Token ID and Token Secret)
   
2. **Create a Signing Key**
   - Go to the MUX dashboard > Settings > Signing Keys
   - Create a new signing key
   - Save both the Signing Key ID and the Private Key

3. **Configure Playback Policies**
   - When creating assets, use the "signed" playback policy for secured videos
   - Public videos can still use the "public" playback policy

## Implementation Details

### Understanding Asset IDs vs Playback IDs

For production use, it's important to understand the difference between asset IDs and playback IDs:

- **Asset ID**: The main identifier for the video in MUX. Use this for:
  - Deleting assets
  - Updating asset metadata
  - Adding new playback IDs
  - Managing static renditions
  - Any administrative operations

- **Playback ID**: The identifier used for playback. Use this for:
  - Creating signed playback URLs
  - Displaying videos in players
  - Creating thumbnail URLs

**Best Practice**: Always store both IDs in your database when creating videos.

### Server-Side Implementation

The server-side implementation includes:

- `src/lib/mux-token.ts`: Utility functions for generating JWT tokens and signed URLs
- `src/lib/mux.ts`: Utility functions for working with MUX assets, including asset ID retrieval
- `src/app/api/mux/signed-url/route.ts`: API endpoint to get a signed URL for a playback ID (now includes asset ID)
- `src/app/api/mux/create-signed-asset/route.ts`: API endpoint to create a MUX asset with a signed playback policy
- `src/app/api/mux/asset/[id]/route.ts`: API endpoints for asset management operations (GET, PATCH, DELETE)

### Client-Side Implementation

The client-side implementation includes:

- `src/components/MuxSignedVideoPlayer.tsx`: Component for playing videos with signed URLs (now tracks asset ID)
- `src/components/MuxSignedVideoUploader.tsx`: Component for creating MUX assets with signed playback
- `src/app/mux-signed-demo/page.tsx`: Demo page showcasing the secure video implementation

## Usage

### Creating a Signed MUX Asset

```tsx
// Example API call to create a signed MUX asset
const response = await fetch('/api/mux/create-signed-asset', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com/video.mp4',
    title: 'My Secure Video',
  }),
});

const data = await response.json();
// data contains assetId, playbackId, signedUrl, token

// Save both IDs to your database for later use
saveToDatabase({
  assetId: data.assetId,
  playbackId: data.playbackId,
  title: 'My Secure Video'
});
```

### Getting a Signed URL for an Existing Playback ID

```tsx
// Example API call to get a signed URL for a playback ID
const response = await fetch('/api/mux/signed-url', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    playbackId: 'your_playback_id',
  }),
});

const data = await response.json();
// data contains url, token, playbackId, and assetId
```

### Playing a Video with a Signed URL

```tsx
// Use the MuxSignedVideoPlayer component
import MuxSignedVideoPlayer from '@/components/MuxSignedVideoPlayer';

function MyComponent() {
  const handleVideoDataLoaded = (data) => {
    console.log('Asset ID:', data.assetId);
    // Store or use the asset ID as needed
  };

  return (
    <MuxSignedVideoPlayer 
      playbackId="your_playback_id"
      onVideoDataLoaded={handleVideoDataLoaded}
    />
  );
}
```

### Managing Videos with Asset ID

```tsx
// Example: Delete a video
const deleteVideo = async (assetId) => {
  const response = await fetch(`/api/mux/asset/${assetId}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (data.success) {
    // Video deleted successfully
  }
};

// Example: Update video metadata
const updateVideoMetadata = async (assetId, metadata) => {
  const response = await fetch(`/api/mux/asset/${assetId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ metadata }),
  });
  const data = await response.json();
  if (data.success) {
    // Metadata updated successfully
  }
};
```

## Security Considerations

- Store your MUX signing key securely - it should only be available server-side
- Set appropriate token expiration times (default is 24 hours in this implementation)
- Consider implementing additional security like user authentication before providing signed URLs
- Remember that signed URLs with valid tokens will work for anyone who has them until they expire
- Protect your asset management APIs with proper authentication to prevent unauthorized deletion/updates

## Demo

To see the demo:

1. Clone this repository
2. Install dependencies: `npm install`
3. Set up your `.env.local` file with MUX credentials
4. Run the development server: `npm run dev`
5. Visit [http://localhost:3000/mux-signed-demo](http://localhost:3000/mux-signed-demo)

## Resources

- [MUX Documentation](https://docs.mux.com/)
- [MUX Signed URLs Guide](https://docs.mux.com/guides/secure-video-playback)
- [MUX Assets API Reference](https://docs.mux.com/api-reference/video/assets/create-asset)
- [JWT.io](https://jwt.io/) - Useful for debugging JWT tokens
