import { Html, Head, Main, NextScript } from 'next/document'
import Document, { DocumentContext, DocumentInitialProps } from 'next/document'

interface CustomDocumentProps extends DocumentInitialProps {
  cspNonce?: string
}

export default function CustomDocument({ cspNonce }: CustomDocumentProps) {
  // Use the nonce passed via props from getInitialProps
  // Fallback to development nonce if prop is not available (shouldn't happen in prod)
  const nonce = cspNonce || (process.env.NODE_ENV !== 'production' ? 'development-nonce' : undefined)

  return (
    <Html lang="en">
      <Head nonce={nonce}> {/* Apply nonce to Head for potential inline styles/scripts added here */}
        {/* Make nonce available to client components via meta tag */}
        {nonce && <meta property="csp-nonce" content={nonce} />} {/* Conditionally render meta tag */}
      </Head>
      <body>
        <Main />
        <NextScript nonce={nonce} /> {/* Apply nonce to NextScript */}
      </body>
    </Html>
  )
}

// Fetch nonce from headers in getInitialProps
CustomDocument.getInitialProps = async (
  ctx: DocumentContext
): Promise<CustomDocumentProps> => {
  const initialProps = await Document.getInitialProps(ctx)
  // Read nonce from the custom header set in middleware
  const cspNonce = ctx.req?.headers['x-csp-nonce'] as string | undefined

  return {
    ...initialProps,
    cspNonce // Pass nonce to the component via props
  }
}
