/**
 * Client-side CSP nonce utilities
 */

/**
 * Gets the CSP nonce from the meta tag
 * @returns The CSP nonce or undefined if not found
 */
export function getCSPNonce(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  
  // Try to get nonce from meta tag
  const metaCSP = document.querySelector('meta[property="csp-nonce"]')
  if (metaCSP) {
    return metaCSP.getAttribute('content') || undefined
  }
  
  // Try to get nonce from script tag (sometimes Next.js adds nonces to scripts)
  const scriptWithNonce = document.querySelector('script[nonce]')
  if (scriptWithNonce) {
    return scriptWithNonce.getAttribute('nonce') || undefined
  }
  
  return undefined
} 