# Content Security Policy (CSP) Implementation Guide

This document explains how we've implemented a secure CSP strategy in our Next.js application and how to properly use the nonce approach for inline scripts.

## What Changed

We've updated our CSP implementation to:

1. Generate a consistent nonce per request in the middleware
2. Ensure this nonce is applied to our inline scripts
3. Configure proper CSP headers with `strict-dynamic` for modern browsers
4. Add fallback to `unsafe-inline` for older browsers
5. Create a relaxed CSP mode for development

## How to Use Nonces in Your Components

### In Server Components

```tsx
import { headers } from 'next/headers'

export default function ServerComponent() {
  // Get the nonce from headers
  const headersList = headers()
  const nonce = headersList.get('x-nonce')
  
  return (
    <div>
      {/* Pass the nonce to client components */}
      <MyClientComponent nonce={nonce} />
    </div>
  )
}
```

### In Client Components

```tsx
'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { getCSPNonce } from '@/lib/csp-client'

interface Props {
  nonce?: string
}

export default function ClientComponent({ nonce }: Props) {
  // For components that don't receive the nonce as a prop
  const [csrNonce, setCsrNonce] = useState<string | undefined>(nonce)
  
  useEffect(() => {
    if (!csrNonce) {
      // Try to get the nonce from meta tag or script tag
      setCsrNonce(getCSPNonce())
    }
  }, [csrNonce])
  
  return (
    <div>
      {/* Use the nonce for inline scripts */}
      <Script
        id="my-script"
        strategy="afterInteractive"
        nonce={csrNonce}
        dangerouslySetInnerHTML={{
          __html: `
            console.log('This script runs safely with CSP!');
          `
        }}
      />
    </div>
  )
}
```

### Using SafeInlineScript Component

We've created a `SafeInlineScript` component that handles CSP nonces:

```tsx
import { SafeInlineScript } from '@/components/debug/SafeInlineScript'

export default function MyComponent() {
  return (
    <div>
      <SafeInlineScript 
        id="my-analytics" 
        code={`
          console.log('Analytics code here');
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
        `}
      />
    </div>
  )
}
```

## Development vs Production

- In development, we use a relaxed CSP to make debugging easier
- In production, we use a strict CSP with nonces for better security
- You can toggle this behavior with the `NEXT_PUBLIC_CSP_MODE` environment variable:
  - Set to `development` for relaxed CSP
  - Set to `production` for strict CSP with nonces

## Troubleshooting

If you see CSP errors in your console:

1. Check if the script is using a nonce
2. Verify the middleware is correctly applying the nonce
3. Try using the SafeInlineScript component
4. For third-party scripts, prefer using the Script component from Next.js
5. As a last resort, temporarily switch to `development` mode

## Important Files

- `src/middleware.ts` - Generates the nonce and applies CSP headers
- `src/lib/csp-client.ts` - Client-side utilities for retrieving the nonce
- `src/components/debug/SafeInlineScript.tsx` - Component for safe inline scripts
- `pages/_document.js` - Applies nonce to Next.js scripts
- `src/app/layout.tsx` - Makes nonce available via meta tag
- `next-safe.config.js` - Base CSP configuration
- `next.config.js` - Applies CSP mode based on environment 