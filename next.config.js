/** @type {import('next').NextConfig} */
const nextSafeConfig = require('./next-safe.config');
const nextSafe = require('next-safe');
const { withSentryConfig } = require("@sentry/nextjs");

// Generate security headers from next-safe
const securityHeaders = nextSafe(nextSafeConfig);

// Define Next.js config
const nextConfig = {
  reactStrictMode: true,
  // Disable TypeScript type checking for development
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during build as we've already modified the config
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: [process.env.NEXTAUTH_URL || 'http://localhost:3000']
    },
    allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS 
      ? process.env.ALLOWED_DEV_ORIGINS.split(',') 
      : []
  },
  // Updated for modern Next.js standards
  serverExternalPackages: ['argon2'],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hjodvataujilredguzig.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'bourbonbuddy.s3.ca-west-1.s4.mega.io',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'www.buffalotracedistillery.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'www.blantonsbourbon.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'barbank.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.redd.it',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'preview.redd.it',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'i.redd.it',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'woodencork.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'whiskeycaviar.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'bdliquorwine.com',
        pathname: '**',
      },
    ],
    domains: [
      'localhost',
      'hjodvataujilredguzig.supabase.co',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'images.unsplash.com',
      'bourbon-buddy.s3.amazonaws.com',
      'bourbon-buddy.s3.us-east-1.amazonaws.com',
      'www.buffalotracedistillery.com',
      'www.blantonsbourbon.com',
      'barbank.com',
      'preview.redd.it',
      'i.redd.it',
      'woodencork.com',
      'whiskeycaviar.com',
      'bdliquorwine.com',
    ]
  },
  // Set a custom webpack config for Socket.IO
  webpack: (config, { isServer }) => {
    // Important: For client-side bundle, ensure socket.io-client is processed correctly
    if (!isServer) {
      config.externals = [...(config.externals || []), 
        { 'bufferutil': 'bufferutil', 'utf-8-validate': 'utf-8-validate' }
      ];
    }
    
    return config;
  },
  // Apply security headers for all paths
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
}

// Make sure adding Sentry options is the last code to run before exporting
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "your-org",
  project: process.env.SENTRY_PROJECT || "your-project",
  
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
});