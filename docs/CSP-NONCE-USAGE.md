# Content Security Policy (CSP) Improvements

This document outlines the security improvements implemented in the middleware to enhance the application's protection against XSS and other common web vulnerabilities.

## Key Improvements

### 1. CSP Nonce Implementation

We've implemented a per-request nonce for Content Security Policy to allow inline scripts while maintaining strict security. This approach avoids using the less secure `'unsafe-inline'` directive.

#### How It Works

1. Middleware generates a random nonce for each request
2. The nonce is added to CSP headers and also passed as `x-nonce` header
3. Server components can access this nonce via the `headers()` API
4. Client components receive the nonce as props from parent server components

#### Example Usage

**In a Server Component:**

```tsx
import { headers } from 'next/headers';

export default function ServerComponent() {
  const headersList = headers();
  const nonce = headersList.get('x-nonce');
  
  return (
    <>
      {/* Safe inline script with nonce */}
      <script 
        nonce={nonce}
        dangerouslySetInnerHTML={{ 
          __html: `console.log('Secure script with nonce');` 
        }}
      />
      
      {/* Pass nonce to client components */}
      <ClientComponent nonce={nonce} />
    </>
  );
}
```

**In a Client Component:**

```tsx
'use client'

interface Props {
  nonce: string;
}

export function ClientComponent({ nonce }: Props) {
  return (
    <script 
      nonce={nonce}
      dangerouslySetInnerHTML={{ 
        __html: `console.log('Client script with nonce');` 
      }}
    />
  );
}
```

### 2. Scoped Development CSP

In development mode, we've replaced the overly permissive wildcard CSP with a more scoped approach that:

- Explicitly lists allowed domains instead of using wildcards
- Maintains development convenience while improving security
- Provides a closer parity between dev and production environments

### 3. Optimized Route Protection

Route protection has been optimized by:

- Using `Set` data structures for O(1) lookups instead of array iterations
- Adding fast path resolution for common routes
- Preserving the fallback for complex path patterns

## Best Practices

1. **Always use the nonce for inline scripts**
   - Avoid `'unsafe-inline'` where possible
   - Use external script files when appropriate

2. **For third-party scripts:**
   - Prefer loading them from external files with hashes or specific domains
   - Only use nonce for scripts you control

3. **Testing CSP:**
   - Use browser developer tools to check for CSP violations
   - Test both development and production environments

## Apple Sign-In Specific Notes

For Sign in with Apple specifically:

1. Apple requires several domains to be allowed in your CSP
2. Apple's authentication requires WebAssembly, so `'wasm-unsafe-eval'` must be present
3. For testing locally, use a proper domain with HTTPS instead of localhost
4. Register all domains in your Apple Developer Portal

## Reference

For more information on CSP best practices, see:
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) 