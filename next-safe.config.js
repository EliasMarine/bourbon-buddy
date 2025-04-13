/**
 * next-safe configuration file
 * @type {import('next-safe').NextSafeConfig}
 */
module.exports = {
  contentSecurityPolicy: {
    'default-src': ["self"],
    'script-src': [
      "self", 
      "strict-dynamic", 
      // Only keep essential domains for script-src when using strict-dynamic
      "https://appleid.cdn-apple.com", 
      "https://signin.apple.com"
    ],
    'style-src': ["self", "unsafe-inline"],
    'img-src': ["self", "data:", "blob:", 
      // Allow all image sources from https and http
      "https:", "http:",
      // Explicitly add domains from error messages
      "*.googleusercontent.com", 
      "*.ggpht.com",
      "*.google.com",
      "*.gstatic.com"
    ],
    'connect-src': [
      "self", 
      // More specific Supabase URLs
      "https://hjodvataujilredguzig.supabase.co",
      "wss://hjodvataujilredguzig.supabase.co", 
      "https://api.openai.com", 
      "https://vercel.live", 
      "https://bourbonbuddy.live", 
      "https://bourbon-buddy.vercel.app",
      // Sentry URLs - comprehensive list to ensure all connections work
      "https://*.ingest.sentry.io",
      "https://o4509142564667392.ingest.us.sentry.io",
      "https://sentry.io",
      "https://*.sentry.io",
      "https://sentry-cdn.com"
    ].concat(
      process.env.NODE_ENV !== "production" 
        ? ["http://localhost:*", "ws://localhost:*"] 
        : []
    ),
    'font-src': ["self", "data:"],
    'frame-src': ["self", "https://appleid.apple.com"],
    'worker-src': ["self", "blob:"],
    'object-src': ["none"],
    'base-uri': ["self"],
    'form-action': ["self"],
    'frame-ancestors': ["self"],
    'manifest-src': ["self"],
    'media-src': ["self"],
    'child-src': ["self", "blob:"],
    'upgrade-insecure-requests': [],
    'report-uri': ["/api/reporting"]
  },
  frameOptions: 'SAMEORIGIN',
  // Disable Feature-Policy completely and only use modern Permissions-Policy
  // This eliminates all Feature-Policy header warnings
  permissionsPolicy: false,
  referrerPolicy: 'origin-when-cross-origin',
  xssProtection: '1; mode=block',
  contentTypeOptions: 'nosniff',
  isDev: process.env.NODE_ENV !== 'production'
} 