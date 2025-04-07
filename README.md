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
DATABASE_URL=postgresql://user:password@host:port/database?pgbouncer=true&connection_limit=1&pool_timeout=10
DIRECT_DATABASE_URL=postgresql://user:password@host:port/database
SHADOW_DATABASE_URL=postgresql://user:password@host:port/shadow_database
REDIS_URL=redis://username:password@host:port
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret
MUX_WEBHOOK_SECRET=your-mux-webhook-secret
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
