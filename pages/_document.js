import { Html, Head, Main, NextScript } from 'next/document'
import { headers } from 'next/headers'

export default function Document() {
  // Attempt to retrieve nonce from headers (set by middleware)
  let cspNonce = '';
  
  try {
    // In Pages Router, we need a different approach than App Router
    // We can't use the headers() function directly here
    // This will be handled at runtime by Next.js
    if (typeof window === 'undefined' && typeof process !== 'undefined') {
      // Let Next.js use the nonce from response headers
      // The middleware sets x-csp-nonce, which Next.js will use
      cspNonce = process.env.CSP_NONCE || '';
    }
  } catch (error) {
    console.error('Error getting CSP nonce:', error);
  }

  return (
    <Html lang="en">
      <Head>
        {/* Make nonce available to client components */}
        <meta property="csp-nonce" content={cspNonce} />
      </Head>
      <body>
        <Main />
        <NextScript nonce={cspNonce} />
      </body>
    </Html>
  )
} 