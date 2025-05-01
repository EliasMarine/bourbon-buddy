/**
 * Client-side CSRF token utilities
 */

/**
 * Simple UUID generator for client-side token generation
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a simple CSRF token on the client side as a fallback
 * This is not as secure as server-generated tokens but better than nothing
 */
export function generateCsrfToken(): string {
  // Create a random token
  const randomPart = Math.random().toString(36).substring(2);
  const timestamp = Date.now().toString(36);
  const uuid = generateUUID();
  
  // Combine them into a token
  return `${randomPart}-${timestamp}-${uuid}`;
}

/**
 * Get the CSRF token from sessionStorage or cookies
 */
export function getCsrfToken(): string | null {
  // Try sessionStorage first
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('csrfToken');
    if (token) return token;
    
    // Then try cookies
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf_secret') {
        return decodeURIComponent(value).split('|')[0];
      }
    }
  }
  
  return null;
}

/**
 * Add CSRF token to a fetch request
 */
export function addCsrfToken(options: RequestInit = {}): RequestInit {
  const token = getCsrfToken();
  if (!token) return options;
  
  return {
    ...options,
    headers: {
      ...options.headers,
      'x-csrf-token': token,
    },
  };
} 