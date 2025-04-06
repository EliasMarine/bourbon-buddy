# 🥃 Bourbon Buddy

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.5.0-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-010101?style=flat&logo=socket.io)](https://socket.io/)
[![Supabase](https://img.shields.io/badge/Supabase-2.49.4-181818?style=flat&logo=supabase)](https://supabase.com/)

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

### 🎥 Live Streaming
- WebRTC-powered live streaming
- Peer-to-peer video communication
- Real-time interaction during tastings
- Low-latency performance

### 🔒 Security & Authentication
- Secure user authentication
- Protected routes and API endpoints
- Rate limiting and DDoS protection
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
  - Supabase Storage for media files
  - Automated backup system

## 🚀 Getting Started

### Prerequisites
- Node.js 22.x
- npm or yarn
- Supabase account and project

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
Edit `.env.local` with your Supabase configuration.

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

2. **Real-time Mode** (for streaming and chat):
```bash
npm run dev:realtime
```

Access the application at [http://localhost:3000](http://localhost:3000)

### Production Deployment

```bash
npm run build
npm run start
```

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

## 📜 License

Custom Personal IP Non-Commercial Use License v1.0  
This project is the intellectual property of Elias Bou Zeid.  
**Non-commercial use only**. Contact bourbonbuddy@bitspec.co for commercial licensing.

## 🤝 Contributing

While this is a personal project, suggestions and feedback are welcome. Please open an issue to discuss potential improvements or report bugs.

## 📞 Support

For support, please contact bourbonbuddy@bitspec.co
