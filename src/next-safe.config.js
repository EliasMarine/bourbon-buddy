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
      "https://plausible.io",
      "https://*.clarity.ms",
      "https://c.bing.com"
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
      "https://c.bing.com"
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
      // ... existing code ...
    )
  }
} 