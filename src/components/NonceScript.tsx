/**
 * This component demonstrates how to use the CSP nonce with the Next.js Script component
 * It needs to be used within a Server Component that passes the nonce as a prop
 */

'use client';

import Script from 'next/script';

interface NonceScriptProps {
  src: string;
  strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload';
  nonce?: string | null;
}

export default function NonceScript({ src, strategy = 'afterInteractive', nonce }: NonceScriptProps) {
  return (
    <Script 
      src={src} 
      strategy={strategy}
      nonce={nonce || undefined} // Only pass nonce if it exists
    />
  );
} 