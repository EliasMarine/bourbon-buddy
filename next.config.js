/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: [process.env.NEXTAUTH_URL || 'http://localhost:3000']
    },
  },
  // Updated for modern Next.js standards
  serverExternalPackages: ['argon2'],
  images: {
    unoptimized: false,
    remotePatterns: [
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
    ],
    domains: [
      'localhost',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
      'images.unsplash.com',
      'bourbon-buddy.s3.amazonaws.com',
      'bourbon-buddy.s3.us-east-1.amazonaws.com',
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
            key: 'Connection',
            value: 'keep-alive',
          },
        ],
      },
    ];
  },
  allowedDevOrigins: ['192.168.1.219', '192.168.1.193']
}

module.exports = nextConfig