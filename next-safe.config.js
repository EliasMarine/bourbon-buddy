/**
 * next-safe configuration file
 * @type {import('next-safe').NextSafeConfig}
 */
module.exports = {
  contentSecurityPolicy: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-eval'",
      "'strict-dynamic'",
      // Adding commented unsafe-inline as a fallback for browsers that don't support strict-dynamic
      // It will be ignored in browsers that support nonces with strict-dynamic
      "'unsafe-inline'",
      "'wasm-unsafe-eval'",
      "https://vercel.live",
      "https://vercel.com",
      "https://hjodvataujilredguzig.supabase.co",
      "https://js.stripe.com",
      "https://appleid.cdn-apple.com", 
      "https://signin.apple.com",
      "https://cdn.jsdelivr.net",
      "https://cdn.paddle.com",
      "https://apis.google.com",
      "https://plausible.io",
      "https://*.clarity.ms",
      "https://c.bing.com",
      "https://cdn.vercel-insights.com",
      "https://va.vercel-scripts.com"
    ],
    'script-src-elem': [
      "'self'",
      "'unsafe-eval'",
      "'strict-dynamic'",
      // Adding commented unsafe-inline as a fallback for browsers that don't support strict-dynamic
      // It will be ignored in browsers that support nonces with strict-dynamic
      "'unsafe-inline'",
      "'wasm-unsafe-eval'",
      "https://vercel.live",
      "https://vercel.com",
      "https://hjodvataujilredguzig.supabase.co",
      "https://js.stripe.com",
      "https://www.apple.com",
      "https://appleid.cdn-apple.com",
      "https://idmsa.apple.com",
      "https://gsa.apple.com",
      "https://idmsa.apple.com.cn",
      "https://signin.apple.com",
      "https://cdn.jsdelivr.net",
      "https://cdn.paddle.com",
      "https://apis.google.com",
      "https://plausible.io",
      "https://*.clarity.ms",
      "https://c.bing.com",
      "https://cdn.vercel-insights.com",
      "https://va.vercel-scripts.com"
    ],
    'worker-src': ["'self'", "blob:", "'unsafe-eval'", "'wasm-unsafe-eval'"],
    'connect-src': [
      "'self'",
      "https://hjodvataujilredguzig.supabase.co",
      "wss://hjodvataujilredguzig.supabase.co",
      "wss://ws-us3.pusher.com",
      "https://api.openai.com", 
      "https://vercel.live", 
      "https://vercel.com",
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
      "https://c.bing.com",
      "https://cdn.vercel-insights.com",
      "https://va.vercel-scripts.com"
    ].concat(
      process.env.NODE_ENV !== "production" 
        ? ["http://localhost:*", "https://localhost:*", "ws://localhost:*", "wss://localhost:*"] 
        : []
    ),
    'frame-src': [
      "'self'", 
      "https://vercel.live", 
      "https://vercel.com",
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