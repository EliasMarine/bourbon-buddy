'use client';

import React from 'react';

interface ScriptWithNonceProps {
  src?: string;
  children?: React.ReactNode;
  async?: boolean;
  defer?: boolean;
  type?: string;
  id?: string;
}

/**
 * A component that renders a script tag with the nonce attribute.
 * This is required for working with strict Content Security Policy.
 * 
 * Usage:
 * <ScriptWithNonce src="/path/to/script.js" />
 * <ScriptWithNonce>{`console.log('Hello world!');`}</ScriptWithNonce>
 */
export default function ScriptWithNonce({
  src,
  children,
  async = false,
  defer = false,
  type = 'text/javascript',
  id,
}: ScriptWithNonceProps) {
  // Get the nonce from the x-nonce meta tag which is set by the middleware
  const [nonce, setNonce] = React.useState<string>('');

  React.useEffect(() => {
    // Get nonce from meta tag that was added by middleware
    const metaNonce = document.querySelector('meta[name="x-nonce"]')?.getAttribute('content');
    if (metaNonce) {
      setNonce(metaNonce);
    }
  }, []);

  if (!nonce) {
    // Don't render until we have a nonce
    return null;
  }

  if (src) {
    // External script
    return (
      <script
        nonce={nonce}
        src={src}
        async={async}
        defer={defer}
        type={type}
        id={id}
      />
    );
  }

  // Inline script
  return (
    <script
      nonce={nonce}
      async={async}
      defer={defer}
      type={type}
      id={id}
      dangerouslySetInnerHTML={{ __html: children as string }}
    />
  );
} 