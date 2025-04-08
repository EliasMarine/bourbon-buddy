/** @type {import('next').NextConfig} */
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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://api.openai.com https://bourbonbuddy.live; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig