/**
 * CSP (Content Security Policy) related utilities
 */

/**
 * Extract the nonce value from the CSP header
 * This is useful for applying nonces to inline scripts in a CSP-compliant way
 * 
 * @param cspHeader - The CSP header string from which to extract the nonce
 * @returns The nonce value or null if not found
 */
export function extractNonceFromCSP(cspHeader: string | null): string | null {
  if (!cspHeader) return null
  
  // Match the nonce pattern in the CSP header
  const nonceMatch = cspHeader.match(/script-src[^;]*'nonce-([^']*)'/)
  if (nonceMatch && nonceMatch[1]) {
    return nonceMatch[1]
  }
  
  return null
}

/**
 * Generate a random nonce value for CSP
 * This should be called for each request to ensure uniqueness
 * 
 * @returns A random nonce string
 */
export function generateNonce(): string {
  // Generate a random nonce value
  return Buffer.from(crypto.randomUUID()).toString('base64')
}

/**
 * Check if the current environment is a development environment
 * This is useful for conditionally applying different CSP rules
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV !== 'production'
}

/**
 * Creates a CSP header with nonces for both script and style elements
 * 
 * @param nonce - The nonce value to use
 * @returns The CSP header string
 */
export function createCSPHeader(nonce: string): string {
  const isDevelopment = isDevelopmentMode();
  
  // Base CSP directives common to all environments
  return `
    default-src 'self';
    font-src 'self' https://vercel.live;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    img-src 'self' data: blob: https://image.mux.com https://vercel.live https://vercel.com https://*.pusher.com/;
    media-src 'self' blob: https://stream.mux.com https://assets.mux.com https://image.mux.com https://*.mux.com https://*.fastly.mux.com https://*.cloudflare.mux.com;
    connect-src 'self' https://hjodvataujilredguzig.supabase.co wss://hjodvataujilredguzig.supabase.co https://api.mux.com https://inferred.litix.io https://stream.mux.com https://assets.mux.com https://*.mux.com https://*.fastly.mux.com https://*.cloudflare.mux.com https://storage.googleapis.com https://vercel.live https://vercel.com https://*.pusher.com wss://*.pusher.com https://vitals.vercel-insights.com;
    frame-src 'self' https://vercel.live https://vercel.com;
    script-src 'self' 'nonce-${nonce}' https://www.gstatic.com https://assets.mux.com https://vercel.live https://vercel.com ${isDevelopment ? "'unsafe-eval'" : ''};
    style-src 'self' 'nonce-${nonce}' 'unsafe-hashes' https://vercel.com;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Sanitize a script or code string to be CSP-friendly
 * This removes potentially dangerous characters and patterns
 * 
 * @param code - The code to sanitize
 * @returns The sanitized code
 */
export function sanitizeScriptContent(code: string): string {
  // Basic sanitization to prevent script tag insertion in script content
  return code.replace(/<\/?script/gi, '&lt;script')
} 