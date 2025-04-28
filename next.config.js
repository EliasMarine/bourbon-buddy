/** @type {import('next').NextConfig} */
const { createSecureHeaders } = require('next-secure-headers')

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';
const cspMode = process.env.NEXT_PUBLIC_CSP_MODE || (isDevelopment ? 'development' : 'production');

// Define Next.js config
const nextConfig = {
  poweredByHeader: false, // Remove X-Powered-By for security
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
    }
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
        headers: createSecureHeaders({
          contentSecurityPolicy: {
            directives: isDevelopment
              ? {
                  defaultSrc: ["'self'"],
                  scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "'unsafe-eval'",
                    'https://www.gstatic.com', // Chromecast support (added)
                    'https://assets.mux.com', // Mux Player scripts
                  ],
                  styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                  ],
                  imgSrc: [
                    "'self'",
                    'data:',
                    'https://image.mux.com', // Mux thumbnails
                  ],
                  mediaSrc: [
                    "'self'",
                    'blob:', // HLS playback
                    'https://stream.mux.com', // Mux video playback
                    'https://assets.mux.com', // Mux Player media
                    'https://image.mux.com', // Mux thumbnails/storyboards
                    'https://*.mux.com', // Mux manifests/segments (wildcard for all mux CDNs)
                    'https://*.fastly.mux.com', // Mux CDN
                    'https://*.cloudflare.mux.com', // Mux CDN
                  ],
                  connectSrc: [
                    "'self'",
                    'ws://localhost:*',
                    'http://localhost:*',
                    'https://hjodvataujilredguzig.supabase.co',
                    'wss://hjodvataujilredguzig.supabase.co',
                    'https://api.mux.com', // Mux analytics
                    'https://inferred.litix.io', // Mux analytics
                    'https://stream.mux.com', // HLS manifest
                    'https://assets.mux.com', // Mux Player analytics
                    'https://*.mux.com', // Mux manifests/segments (wildcard for all mux CDNs)
                    'https://*.fastly.mux.com', // Mux CDN
                    'https://*.cloudflare.mux.com', // Mux CDN
                    'https://storage.googleapis.com', // Google Cloud Storage for Mux uploads
                  ],
                  frameSrc: [
                    "'self'",
                  ],
                }
              : {
                  defaultSrc: ["'self'"],
                  scriptSrc: [
                    "'self'",
                    'https://www.gstatic.com', // Chromecast support (added)
                    'https://assets.mux.com', // Mux Player scripts
                  ],
                  styleSrc: [
                    "'self'",
                    "'unsafe-inline'", // Only if needed for styled-jsx/emotion
                  ],
                  imgSrc: [
                    "'self'",
                    'data:',
                    'https://image.mux.com', // Mux thumbnails
                  ],
                  mediaSrc: [
                    "'self'",
                    'blob:', // HLS playback
                    'https://stream.mux.com', // Mux video playback
                    'https://assets.mux.com', // Mux Player media
                    'https://image.mux.com', // Mux thumbnails/storyboards
                    'https://*.mux.com', // Mux manifests/segments (wildcard for all mux CDNs)
                    'https://*.fastly.mux.com', // Mux CDN
                    'https://*.cloudflare.mux.com', // Mux CDN
                  ],
                  connectSrc: [
                    "'self'",
                    'https://hjodvataujilredguzig.supabase.co',
                    'wss://hjodvataujilredguzig.supabase.co',
                    'https://api.mux.com', // Mux analytics
                    'https://inferred.litix.io', // Mux analytics
                    'https://stream.mux.com', // HLS manifest
                    'https://assets.mux.com', // Mux Player analytics
                    'https://*.mux.com', // Mux manifests/segments (wildcard for all mux CDNs)
                    'https://*.fastly.mux.com', // Mux CDN
                    'https://*.cloudflare.mux.com', // Mux CDN
                    'https://storage.googleapis.com', // Google Cloud Storage for Mux uploads
                  ],
                  frameSrc: [
                    "'self'",
                  ],
                }
          },
          forceHTTPSRedirect: [true, { maxAge: 60 * 60 * 24 * 4, includeSubDomains: true }],
          referrerPolicy: 'same-origin',
          nosniff: 'nosniff',
          xssProtection: 'sanitize',
          frameGuard: 'deny',
        }),
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
};

// Make sure adding Sentry options is the last code to run before exporting
module.exports = nextConfig;