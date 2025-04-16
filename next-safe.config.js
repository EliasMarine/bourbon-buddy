/**
 * next-safe configuration file
 * @type {import('next-safe').NextSafeConfig}
 */
module.exports = {
  contentSecurityPolicy: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "'wasm-unsafe-eval'",
      "https://vercel.live",
      "https://hjodvataujilredguzig.supabase.co",
      "https://js.stripe.com"
    ],
    'script-src-elem': [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      "'wasm-unsafe-eval'",
      "https://vercel.live",
      "https://hjodvataujilredguzig.supabase.co",
      "https://js.stripe.com"
    ],
    'worker-src': ["'self'", "blob:", "'unsafe-eval'", "'wasm-unsafe-eval'"],
    'connect-src': [
      "'self'",
      "https://hjodvataujilredguzig.supabase.co",
      "wss://hjodvataujilredguzig.supabase.co",
      "wss://ws-us3.pusher.com",
      "https://api.openai.com", 
      "https://vercel.live", 
      "https://bourbonbuddy.live", 
      "https://bourbon-buddy.vercel.app",
      "https://api.stripe.com",
      "https://checkout.paddle.com",
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
    'frame-src': [
      "'self'", 
      "https://vercel.live", 
      "https://appleid.apple.com",
      "https://js.stripe.com",
      "https://checkout.paddle.com"
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", "data:", "blob:", "https:", "http:"],
    'font-src': ["'self'", "data:", "https://fonts.gstatic.com"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
    'manifest-src': ["'self'"],
    'media-src': ["'self'"],
    'child-src': ["'self'", "blob:"]
  },
  frameOptions: 'SAMEORIGIN',
  permissionsPolicy: false,
  referrerPolicy: 'origin-when-cross-origin',
  xssProtection: '1; mode=block',
  contentTypeOptions: 'nosniff',
  isDev: process.env.NODE_ENV !== 'production'
} 