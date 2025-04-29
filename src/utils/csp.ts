import { headers } from 'next/headers';

/**
 * Gets the CSP nonce from request headers
 * Use this function in Server Components to retrieve the nonce
 * and pass it to Client Components or Script tags
 */
export async function getNonce(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get('x-nonce');
  } catch (error) {
    // If headers() fails, we're not in a server component context
    console.error('Failed to get nonce from headers:', error);
    return null;
  }
} 