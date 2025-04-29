import { getNonce } from '@/utils/csp';
import NonceScript from './NonceScript';

/**
 * Example Server Component that demonstrates how to use nonces with scripts
 * This component retrieves the nonce from headers and passes it to client components
 */
export default async function NonceExample() {
  // Get the nonce from headers (middleware sets this)
  const nonce = await getNonce();
  
  return (
    <div>
      <h2>CSP Nonce Example</h2>
      
      {/* Example of using the nonce with an external script */}
      <NonceScript 
        src="https://www.googletagmanager.com/gtag/js" 
        nonce={nonce} 
      />
      
      {/* 
        Note: For inline scripts, Next.js doesn't have a built-in way to apply nonces.
        One approach is to create a specialized component for inline scripts:
      */}
      <InlineScript nonce={nonce}>
        {`
          // Your inline JavaScript here
          console.log('This script runs with a nonce');
        `}
      </InlineScript>
    </div>
  );
}

// Client component for inline scripts with nonce
'use client';

interface InlineScriptProps {
  children: string;
  nonce?: string | null;
}

function InlineScript({ children, nonce }: InlineScriptProps) {
  return (
    <script 
      dangerouslySetInnerHTML={{ __html: children }} 
      nonce={nonce || undefined}
    />
  );
} 