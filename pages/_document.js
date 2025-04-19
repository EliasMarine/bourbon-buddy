import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  // In production, NextScript will automatically use the nonce from the CSP header
  // In development, we use a fixed nonce for simplicity
  const cspNonce = process.env.NODE_ENV === 'production' 
    ? undefined // In production, NextScript will get the nonce from response headers
    : 'development-nonce' // In development, use a fixed nonce

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
