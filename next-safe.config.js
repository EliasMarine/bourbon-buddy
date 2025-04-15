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
      "unsafe-inline", 
      "unsafe-eval", 
      "wasm-unsafe-eval",
      // Only keep essential domains for script-src when using strict-dynamic
      "https://appleid.cdn-apple.com", 
      "https://signin.apple.com",
      "https://js.stripe.com",
      "https://cdn.jsdelivr.net",
      "https://cdn.paddle.com",
      "https://apis.google.com",
      "https://plausible.io",
      "https://*.clarity.ms",
      "https://c.bing.com",
      "https://vercel.live",
      "https://hjodvataujilredguzig.supabase.co"
    ],
    // Add script-src-elem directive to handle inline scripts and elements
    'script-src-elem': [
      "self",
      "unsafe-inline",
      "unsafe-eval",
      "wasm-unsafe-eval",
      "https://www.apple.com",
      "https://appleid.cdn-apple.com",
      "https://idmsa.apple.com",
      "https://gsa.apple.com",
      "https://idmsa.apple.com.cn",
      "https://signin.apple.com",
      "https://vercel.live",
      "https://js.stripe.com",
      "https://cdn.jsdelivr.net",
      "https://cdn.paddle.com",
      "https://apis.google.com",
      "https://plausible.io",
      "https://*.clarity.ms",
      "https://c.bing.com",
      "https://hjodvataujilredguzig.supabase.co"
    ],
    'style-src': ["self", "unsafe-inline"],
    'img-src': ["self", "data:", "blob:", 
      // Allow all image sources from https and http
      "https:", "http:",
      // Explicitly add domains from error messages
      "*.googleusercontent.com", 
      "*.ggpht.com",
      "*.google.com",
      "*.gstatic.com",
      // Spirit image sources - add all potential domains
      "*.amazonaws.com",
      "*.cloudinary.com",
      "*.buffalotracedistillery.com",
      "*.blantonsbourbon.com",
      "barbank.com",
      "*.redd.it",
      "preview.redd.it",
      "i.redd.it",
      "woodencork.com",
      "whiskeycaviar.com",
      "bdliquorwine.com",
      "hjodvataujilredguzig.supabase.co",
      "bourbonbuddy.s3.ca-west-1.s4.mega.io",
      "bourbon-buddy.s3.us-east-1.amazonaws.com"
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
      "https://api.stripe.com",
      "https://checkout.paddle.com",
      // Sentry URLs - comprehensive list to ensure all connections work
      "https://*.ingest.sentry.io",
      "https://o4509142564667392.ingest.us.sentry.io",
      "https://sentry.io",
      "https://*.sentry.io",
      "https://sentry-cdn.com",
      "https://*.clarity.ms",
      "https://c.bing.com"
    ].concat(
      process.env.NODE_ENV !== "production" 
        ? ["http://localhost:*", "ws://localhost:*"] 
        : []
    ),
    'font-src': ["self", "data:", "https://fonts.gstatic.com"],
    'frame-src': [
      "self", 
      "https://appleid.apple.com",
      "https://js.stripe.com",
      "https://checkout.paddle.com",
      "https://vercel.live"
    ],
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