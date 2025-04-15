import { Html, Head, Main, NextScript } from 'next/document'
import crypto from 'crypto'

export default function Document() {
  // Generate a new nonce value for each request
  const nonce = crypto.randomBytes(16).toString('base64')

  // Define a CSP that allows everything needed for your app
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' 'nonce-${nonce}' https://*.supabase.co https://vercel.live https://*.clarity.ms https://c.bing.com;
    script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' 'nonce-${nonce}' https://*.supabase.co https://vercel.live https://*.clarity.ms https://c.bing.com https://www.apple.com https://appleid.cdn-apple.com https://idmsa.apple.com https://gsa.apple.com https://idmsa.apple.com.cn https://signin.apple.com;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co wss://ws-us3.pusher.com https://api.openai.com https://vercel.live https://*.vercel.app https: http:;
    style-src 'self' 'unsafe-inline' 'nonce-${nonce}';
    img-src 'self' data: blob: https: http:;
    font-src 'self' data: https://fonts.gstatic.com;
    frame-src 'self' https://vercel.live https://appleid.apple.com https://js.stripe.com https://checkout.paddle.com;
    object-src 'none';
    base-uri 'self';
  `.replace(/\s{2,}/g, ' ').trim()

  return (
    <Html>
      <Head nonce={nonce}>
        {/* Add CSP meta tag that will override headers */}
        <meta httpEquiv="Content-Security-Policy" content={csp} />
      </Head>
      <body>
        <Main />
        <NextScript nonce={nonce} />
      </body>
    </Html>
  )
} 