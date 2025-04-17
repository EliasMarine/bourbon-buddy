import { Html, Head, Main, NextScript } from 'next/document'
import crypto from 'crypto'

export default function Document() {
  // Generate a random nonce server-side
  // This approach ensures the nonce is generated when the document is rendered
  const cspNonce = typeof process !== 'undefined' ? 
    (process.env.CSP_NONCE || crypto.randomBytes(16).toString('base64')) : 
    null

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