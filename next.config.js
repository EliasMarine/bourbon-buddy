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
    const isVercelPreview = process.env.VERCEL_ENV === 'preview' || 
                           process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
    
    // Default security headers (from next-safe)
    const defaultHeaders = [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
    
    // Add specific CORS headers for Vercel preview environments
    if (isVercelPreview) {
      console.log('🔒 Adding CORS headers for Vercel preview environment');
      
      defaultHeaders.push({
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, x-csrf-token, csrf-token, X-CSRF-Token',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          // Add cache control headers to prevent caching of API responses
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma', 
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      });
    }
    
    return defaultHeaders;
  },
}

// Make sure adding Sentry options is the last code to run before exporting
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "bourbon-buddy",
  project: process.env.SENTRY_PROJECT || "bourbon-buddy",
  
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enable debug ID injection - IMPORTANT for source maps
  injectDebugIds: true,
  
  // Upload source maps during build
  sourcemaps: {
    // Include source maps for both client and server bundles
    assets: ['.next/static/chunks/**.js', '.next/server/chunks/**.js'],
    // Only upload source maps related to the app, not node_modules
    ignore: ['node_modules'],
  },
  
  // Enable debug to troubleshoot source map issues
  debug: true,
});