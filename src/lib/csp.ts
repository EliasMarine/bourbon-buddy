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
 * Uses a secure approach with nonces and specific content hashes,
 * avoiding unsafe-inline completely for better security.
 * 
 * @param nonce - The nonce value to use
 * @returns The CSP header string
 */
export function createCSPHeader(nonce: string): string {
  const isDevelopment = isDevelopmentMode();
  
  // Base CSP directives common to all environments
  // Merged sources from previous middleware for broader compatibility
  const baseCsp = `
    default-src 'self';
    font-src 'self' https://vercel.live https://fonts.googleapis.com https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    img-src 'self' data: blob: https://*.mux.com https://image.mux.com https://mux.com https://vercel.live https://vercel.com https://*.pusher.com/ https://*.amazonaws.com https://*.supabase.co https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://*.redd.it https://preview.redd.it https://i.redd.it https://www.buffalotracedistillery.com https://www.blantonsbourbon.com https://barbank.com https://woodencork.com https://whiskeycaviar.com https://bdliquorwine.com https://bourbonbuddy.s3.ca-west-1.s4.mega.io https://www.masterofmalt.com;
    media-src 'self' blob: https://*.mux.com https://mux.com https://stream.mux.com https://assets.mux.com https://image.mux.com https://*.fastly.mux.com https://*.cloudflare.mux.com https://*.litix.io;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mux.com https://mux.com https://inferred.litix.io https://*.litix.io https://stream.mux.com https://assets.mux.com https://*.mux.com https://*.fastly.mux.com https://*.cloudflare.mux.com https://storage.googleapis.com https://vercel.live https://vercel.com https://*.pusher.com wss://*.pusher.com https://vitals.vercel-insights.com https://serpapi.com;
    frame-src 'self' https://vercel.live https://vercel.com https://*.mux.com;
    script-src 'self' 'nonce-${nonce}' https://www.gstatic.com https://assets.mux.com https://mux.com https://cdn.jsdelivr.net https://vercel.live https://vercel.com ${isDevelopment ? "'unsafe-eval'" : ''};
    upgrade-insecure-requests;
  `;

  // Conditional style-src
  // We use nonces and specific content hashes for all inline styles to ensure maximum security
  // This is a more secure approach than using 'unsafe-inline', especially for production
  let styleSrcDirective = `'self' 'nonce-${nonce}' https://vercel.com https://fonts.googleapis.com`;
  if (isDevelopment) {
    // In development, allow 'unsafe-inline' for styles for easier DX (e.g. HMR).
    // styleSrcDirective += " 'unsafe-inline'";
    // Even in dev, prefer hashed values over unsafe-inline to maintain security
    styleSrcDirective += " 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='";
    styleSrcDirective += " 'sha256-7lAG9nNPimWNBky6j9qnn0jfFzu5wK96KOj/UzoG0hg='";
    styleSrcDirective += " 'sha256-LL1Oj3pIToBpzHWMlAyrmK9guWSsY8Nr8wq7gA/m/ew='"; // Mux Player
    styleSrcDirective += " 'sha256-8mIk1oX3LmRB+UWuFGvbo1hLWczGs3Z5yXDPHotWXlQ='"; // Mux Player
    styleSrcDirective += " 'sha256-ZYns29och5nBGFV2O2mG0POX+mI2q4UFtJuvS1eoGF0='"; // Mux Player
    styleSrcDirective += " 'sha256-DSYmRr35z6zyfy04z49VxSw/Fjw5T+rlVRbZWRT8U/I='"; // Mux Player
    styleSrcDirective += " 'sha256-OYG2xTYpFINTWWpa7AYS4DfPiIyxrHaKeuWu5xqQjPE='"; // Mux Player
    styleSrcDirective += " 'sha256-nzTgYzXYDNe6BAHiiI7NNlfK8n/auuOAhh2t92YvuXo='";
    styleSrcDirective += " 'sha256-Nqnn8clbgv+5l0PgxcTOldg8mkMKrFn4TvPL+rYUUGg='";
    styleSrcDirective += " 'sha256-13vrThxdyT64GcXoTNGVoRRoL0a7EGBmOJ+lemEWyws='";
    styleSrcDirective += " 'sha256-QZ52fjvWgIOIOPr+gRIJZ7KjzNeTBm50Z+z9dH4N1/8='";
    styleSrcDirective += " 'sha256-yOU6eaJ75xfag0gVFUvld5ipLRGUy94G17B1uL683EU='";
    styleSrcDirective += " 'sha256-OpTmykz0m3o5HoX53cykwPhUeU4OECxHQlKXpB0QJPQ='";
    styleSrcDirective += " 'sha256-SSIM0kI/u45y4gqkri9aH+la6wn2R+xtcBj3Lzh7qQo='";
    styleSrcDirective += " 'sha256-ZH/+PJIjvP1BctwYxclIuiMu1wItb0aasjpXYXOmU0Y='";
    styleSrcDirective += " 'sha256-58jqDtherY9NOM+ziRgSqQY0078tAZ+qtTBjMgbM9po='";
    styleSrcDirective += " 'sha256-7Ri/I+PfhgtpcL7hT4A0VJKI6g3pK0ZvIN09RQV4ZhI='";
    styleSrcDirective += " 'sha256-+1ELCr8ReJfJBjWJ10MIbLJZRYsIfwdKV+UKdFVDXyo='"; // Additional Mux Player hashes
    styleSrcDirective += " 'sha256-MktN23nRzohmT1JNxPQ0B9CzVW6psOCbvJ20j9YxAxA='"; 
    styleSrcDirective += " 'sha256-47lXINn3kn6TjA9CnVQoLLxD4bevVlCtoMcDr8kZ1kc='";
    styleSrcDirective += " 'sha256-wkAU1AW/h8RKmZ3BUsffwzbTWBeIGD83S5VR9RhiQtk='";
    styleSrcDirective += " 'sha256-MQsH+WZ41cJWVrTw3AC5wJ8LdiYKgwTlENhYI5UKpow='";
    styleSrcDirective += " 'sha256-TIidHKBLbE0MY7TLE+9G8QOzGXaS7aIwJ1xJRtTd3zk='";
  } else {
    // In production, add specific hashes for known inline styles
    styleSrcDirective += " 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='";
    styleSrcDirective += " 'sha256-7lAG9nNPimWNBky6j9qnn0jfFzu5wK96KOj/UzoG0hg='";
    styleSrcDirective += " 'sha256-LL1Oj3pIToBpzHWMlAyrmK9guWSsY8Nr8wq7gA/m/ew='"; // Mux Player
    styleSrcDirective += " 'sha256-8mIk1oX3LmRB+UWuFGvbo1hLWczGs3Z5yXDPHotWXlQ='"; // Mux Player
    styleSrcDirective += " 'sha256-ZYns29och5nBGFV2O2mG0POX+mI2q4UFtJuvS1eoGF0='"; // Mux Player
    styleSrcDirective += " 'sha256-DSYmRr35z6zyfy04z49VxSw/Fjw5T+rlVRbZWRT8U/I='"; // Mux Player
    styleSrcDirective += " 'sha256-OYG2xTYpFINTWWpa7AYS4DfPiIyxrHaKeuWu5xqQjPE='"; // Mux Player
    styleSrcDirective += " 'sha256-nzTgYzXYDNe6BAHiiI7NNlfK8n/auuOAhh2t92YvuXo='";
    styleSrcDirective += " 'sha256-Nqnn8clbgv+5l0PgxcTOldg8mkMKrFn4TvPL+rYUUGg='";
    styleSrcDirective += " 'sha256-13vrThxdyT64GcXoTNGVoRRoL0a7EGBmOJ+lemEWyws='";
    styleSrcDirective += " 'sha256-QZ52fjvWgIOIOPr+gRIJZ7KjzNeTBm50Z+z9dH4N1/8='";
    styleSrcDirective += " 'sha256-yOU6eaJ75xfag0gVFUvld5ipLRGUy94G17B1uL683EU='";
    styleSrcDirective += " 'sha256-OpTmykz0m3o5HoX53cykwPhUeU4OECxHQlKXpB0QJPQ='";
    styleSrcDirective += " 'sha256-SSIM0kI/u45y4gqkri9aH+la6wn2R+xtcBj3Lzh7qQo='";
    styleSrcDirective += " 'sha256-ZH/+PJIjvP1BctwYxclIuiMu1wItb0aasjpXYXOmU0Y='";
    styleSrcDirective += " 'sha256-58jqDtherY9NOM+ziRgSqQY0078tAZ+qtTBjMgbM9po='";
    styleSrcDirective += " 'sha256-7Ri/I+PfhgtpcL7hT4A0VJKI6g3pK0ZvIN09RQV4ZhI='";
    styleSrcDirective += " 'sha256-+1ELCr8ReJfJBjWJ10MIbLJZRYsIfwdKV+UKdFVDXyo='"; // Additional Mux Player hashes
    styleSrcDirective += " 'sha256-MktN23nRzohmT1JNxPQ0B9CzVW6psOCbvJ20j9YxAxA='"; 
    styleSrcDirective += " 'sha256-47lXINn3kn6TjA9CnVQoLLxD4bevVlCtoMcDr8kZ1kc='";
    styleSrcDirective += " 'sha256-wkAU1AW/h8RKmZ3BUsffwzbTWBeIGD83S5VR9RhiQtk='";
    styleSrcDirective += " 'sha256-MQsH+WZ41cJWVrTw3AC5wJ8LdiYKgwTlENhYI5UKpow='";
    styleSrcDirective += " 'sha256-TIidHKBLbE0MY7TLE+9G8QOzGXaS7aIwJ1xJRtTd3zk='";
  }
  // In production, 'unsafe-inline' is deliberately omitted. Inline styles MUST use the nonce or be hashed.
  
  return `${baseCsp} style-src ${styleSrcDirective};`.replace(/\s{2,}/g, ' ').trim();
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