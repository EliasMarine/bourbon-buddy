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
 * Check if the current environment is a development environment
 * This is useful for conditionally applying different CSP rules
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV !== 'production'
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