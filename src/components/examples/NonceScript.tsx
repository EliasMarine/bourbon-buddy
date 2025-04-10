/**
 * This component demonstrates how to use the CSP nonce 
 * for inline scripts with Next.js App Router.
 * 
 * To use the nonce in your application:
 * 
 * 1. Server Components:
 *    const headersList = headers()
 *    const nonce = headersList.get('x-nonce')
 * 
 * 2. Client Components:
 *    Receive the nonce as a prop from a parent Server Component
 * 
 * 3. Apply the nonce to script tags:
 *    <script nonce={nonce}>...</script>
 */

'use client'

interface NonceScriptExampleProps {
  nonce?: string
}

export default function NonceScriptExample({ nonce }: NonceScriptExampleProps) {
  return (
    <div className="p-4 border border-gray-200 rounded-md">
      <h3 className="font-semibold mb-2">CSP Nonce Example</h3>
      
      {nonce && (
        <script 
          nonce={nonce}
          dangerouslySetInnerHTML={{ 
            __html: `
              console.log('This script is secure with nonce: ${nonce.substring(0, 8)}...');
              document.currentScript.parentElement.dataset.executed = 'true';
            `
          }}
        />
      )}
      
      <p className="text-sm text-gray-600">
        {nonce 
          ? `Using nonce: ${nonce.substring(0, 8)}...` 
          : "No nonce provided. Scripts won't execute with strict CSP."}
      </p>
      
      <div className="mt-4 bg-gray-100 p-3 rounded text-xs font-mono">
        <pre>{`
// In your layout.tsx or page.tsx:
import { headers } from 'next/headers';
import NonceScriptExample from '@/components/examples/NonceScript';

export default function Page() {
  const headersList = headers();
  const nonce = headersList.get('x-nonce');
  
  return (
    <NonceScriptExample nonce={nonce} />
  );
}
        `}</pre>
      </div>
    </div>
  )
} 