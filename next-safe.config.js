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
      // Only keep essential domains for script-src when using strict-dynamic
      "https://appleid.cdn-apple.com", 
      "https://signin.apple.com",
      "https://js.stripe.com",
      "https://cdn.jsdelivr.net",
      "https://cdn.paddle.com",
      "https://apis.google.com",
      "https://plausible.io"
    ],
    // Add script-src-elem directive to handle inline scripts and elements
    'script-src-elem': [
      "self",
      "unsafe-inline",
      "unsafe-eval", // Add unsafe-eval back for dev tools and extensions
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
      "https://unpkg.com",
      "https://cdn.coinbase.com",
      "https://metamask.io",
      "https://metamask.app"
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
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://api.openai.com", 
      "https://vercel.live",
      "https://*.vercel.live",
      "wss://*.vercel.live",
      "https://bourbonbuddy.live", 
      "wss://bourbonbuddy.live",
      "https://bourbon-buddy.vercel.app",
      "wss://bourbon-buddy.vercel.app",
      "https://api.stripe.com",
      "https://checkout.paddle.com",
      // Sentry URLs - comprehensive list to ensure all connections work
      "https://*.ingest.sentry.io",
      "https://o4509142564667392.ingest.us.sentry.io",
      "https://sentry.io",
      "https://*.sentry.io",
      "https://sentry-cdn.com",
      // Allow MetaMask and wallet providers
      "https://*.infura.io",
      "https://metamask.io",
      "https://*.coinbase.com",
      "wss://*.bridge.walletconnect.org"
    ].concat(
      process.env.NODE_ENV !== "production" 
        ? ["http://localhost:*", "ws://localhost:*", "wss://localhost:*"] 
        : []
    ),
    'font-src': ["self", "data:", "https://fonts.gstatic.com"],
    'frame-src': [
      "self", 
      "https://appleid.apple.com",
      "https://js.stripe.com",
      "https://checkout.paddle.com",
      "https://metamask.app",
      "https://*.coinbase.com"
    ],
    'worker-src': ["self", "blob:", "data:"],
    'object-src': ["none"],
    'base-uri': ["self"],
    'form-action': ["self"],
    'frame-ancestors': ["self"],
    'manifest-src': ["self"],
    'media-src': ["self", "blob:", "data:"],
    'child-src': ["self", "blob:"],
    'upgrade-insecure-requests': [],
    'report-uri': ["/api/reporting"]
  },
  frameOptions: 'SAMEORIGIN',
  // Disable Feature-Policy completely and only use modern Permissions-Policy
  // This eliminates all Feature-Policy header warnings
  permissionsPolicy: {
    'geolocation': ["none"],
    'microphone': ["self"],
    'camera': ["self"],
    'fullscreen': ["self"],
    'payment': ["none"]
  },
  referrerPolicy: 'origin-when-cross-origin',
  xssProtection: '1; mode=block',
  contentTypeOptions: 'nosniff',
  isDev: process.env.NODE_ENV !== 'production'
} 