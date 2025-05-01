import { serialize } from 'cookie'
import Tokens from 'csrf'
import { nanoid } from 'nanoid'

// Uses a stronger algorithm and longer secret
const tokens = new Tokens({
  secretLength: 32,
  saltLength: 16
})

// Cookie name for CSRF token
export const CSRF_COOKIE_NAME = 'csrf_secret'

// Get cookie name based on environment
export function getCsrfCookieName() {
  // Use environment variable as override if present
  if (process.env.CSRF_COOKIE_NAME) {
    return process.env.CSRF_COOKIE_NAME
  }
  
  return CSRF_COOKIE_NAME
}

// Also support NextAuth's CSRF token
export const getNextAuthCsrfCookieName = () => {
  return 'next-auth.csrf-token'
}

// Generate a CSRF token with expiration tracking
export function generateCsrfToken() {
  try {
    const secret = nanoid(32)
    const token = tokens.create(secret)
    
    return { 
      secret,
      token,
      createdAt: Date.now()
    }
  } catch (error) {
    console.error('Error generating CSRF token:', error)
    // Fallback to simple token generation
    const fallbackSecret = Math.random().toString(36).substring(2)
    const fallbackToken = Math.random().toString(36).substring(2)
    
    return {
      secret: fallbackSecret,
      token: fallbackToken,
      createdAt: Date.now()
    }
  }
}

// Verify a CSRF token
export function verifyCsrfToken(secret: string, token: string) {
  try {
    console.log('Attempting to verify CSRF token...', {
      secretExists: !!secret,
      secretLength: secret?.length || 0,
      tokenExists: !!token,
      tokenLength: token?.length || 0,
    })
    
    const isValid = tokens.verify(secret, token)
    console.log('CSRF token verification result:', isValid)
    return isValid
  } catch (error) {
    console.error('CSRF verification error:', error)
    return false
  }
}

/**
 * Creates a CSRF cookie with the given secret
 * @param secret The CSRF secret to store in the cookie
 * @param createdAt Timestamp when the token was created
 * @returns Cookie header string
 */
export function createCsrfCookie(secret: string, createdAt: number): string {
  const cookieName = getCsrfCookieName();
  const cookieValue = `${secret}|${createdAt}`;
  
  // Get environment
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Always use 'None' with Secure in production, regardless of CSRF_SAME_SITE env var
  // For development, 'Lax' is fine
  const sameSite = isProduction ? 'None' : 'Lax';
  
  // Debug mode
  const debug = process.env.DEBUG_CSRF === 'true';
  if (debug) {
    console.log('Creating CSRF cookie with settings:', {
      cookieName,
      sameSite,
      secure: isProduction,
      environment: process.env.NODE_ENV,
      domain: process.env.COOKIE_DOMAIN || null,
    });
  }
  
  // Configure cookie options for better security and browser compatibility
  const cookieOptions = [
    `${cookieName}=${encodeURIComponent(cookieValue)}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=${sameSite}`,
    ...(isProduction || sameSite === 'None' ? [`Secure`] : []),
    // Max-age of 7 days
    `Max-Age=${60 * 60 * 24 * 7}`
  ];
  
  // Add domain if specified (useful for cross-subdomain support)
  if (process.env.COOKIE_DOMAIN) {
    cookieOptions.push(`Domain=${process.env.COOKIE_DOMAIN}`);
  }
  
  return cookieOptions.join('; ');
}

// Parse cookies from a string
export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  
  try {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=')
      const trimmedName = name?.trim()
      
      if (!trimmedName) return
      
      const value = rest.join('=').trim()
      
      if (value) {
        cookies[trimmedName] = decodeURIComponent(value)
      }
    })
  } catch (error) {
    console.error('Error parsing cookies:', error)
  }
  
  return cookies
}

// Extract the CSRF secret from cookies
export function extractCsrfSecret(cookies: Record<string, string>) {
  const cookieName = getCsrfCookieName()
  const csrfCookieValue = cookies[cookieName]
  
  if (!csrfCookieValue) {
    console.warn('CSRF cookie not found. Available cookies:', Object.keys(cookies).join(', '))
    return null
  }
  
  try {
    // Various formats we might encounter
    if (csrfCookieValue.includes('|')) {
      // Format: secret|timestamp
      const [secret, timestampStr] = csrfCookieValue.split('|')
      const timestamp = parseInt(timestampStr, 10) || (Date.now() - 60000)
      return { secret, createdAt: timestamp }
    }
    
    // Try to parse it as JSON (new format)
    try {
      const parsed = JSON.parse(csrfCookieValue)
      return {
        secret: parsed.secret,
        createdAt: parsed.createdAt || Date.now() - 60000
      }
    } catch {
      // Not JSON, treat as raw secret
      return {
        secret: csrfCookieValue,
        createdAt: Date.now() - 60000 // Assume it's 1 minute old
      }
    }
  } catch (e) {
    console.error('Error parsing CSRF cookie value:', e)
    // Fallback to assuming it's just the raw secret string (last resort)
    return {
      secret: csrfCookieValue,
      createdAt: Date.now() - 60000 // Assume it's 1 minute old
    }
  }
}

// Cache for recently validated tokens to avoid revalidation overhead
const validatedTokensCache = new Map<string, boolean>();

// Middleware helper to validate CSRF tokens
export function validateCsrfToken(req: Request, csrfToken?: string) {
  // Skip validation in development if enabled - this should be reliable
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const hasBypassFlag = process.env.BYPASS_CSRF === 'true';
  
  if (isDevelopment || hasBypassFlag) {
    console.log('CSRF validation bypassed:', {
      environment: process.env.NODE_ENV,
      bypassFlag: hasBypassFlag
    });
    return true;
  }

  const url = new URL(req.url);
  const isProduction = process.env.NODE_ENV === 'production';
  const debug = process.env.DEBUG_CSRF === 'true' || isProduction;
  
  // Always log detailed information for CSRF errors in production
  const enhancedDebug = true;
  
  // For GET requests, CSRF validation isn't strictly necessary
  if (req.method === 'GET') {
    console.log('Skipping CSRF validation for GET request');
    return true;
  }

  // Extract CSRF token from header if not provided
  if (!csrfToken) {
    // Try each header variant
    const xCsrfToken = req.headers.get('x-csrf-token');
    const csrfTokenHeader = req.headers.get('csrf-token');
    const xCsrfTokenUpper = req.headers.get('X-CSRF-Token');
    
    csrfToken = xCsrfToken || csrfTokenHeader || xCsrfTokenUpper || undefined;
    
    if (!csrfToken) {
      console.warn('CSRF token missing from request headers', {
        headers: Array.from(req.headers.keys()),
        url: url.pathname,
      });
      return false;
    }
  }
  
  // Check cache first to avoid reprocessing the same token
  const cacheKey = `${csrfToken}`;
  if (validatedTokensCache.has(cacheKey)) {
    return validatedTokensCache.get(cacheKey) as boolean;
  }
  
  // Get cookies from request
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) {
    console.warn('No cookies found in request', {
      url: url.pathname,
      method: req.method,
      headers: Array.from(req.headers.keys()),
    });
    return false;
  }
  
  // Extract CSRF secret from cookies
  const cookies = parseCookies(cookieHeader)
  if (debug) {
    console.log('🍪 Cookies found in request:', {
      cookieCount: Object.keys(cookies).length,
      cookieNames: Object.keys(cookies).join(', '),
      hasCsrfCookie: !!cookies[getCsrfCookieName()],
      csrfCookieName: getCsrfCookieName(),
      url: url.pathname,
    })
  }
  
  const secretData = extractCsrfSecret(cookies)
  
  if (!secretData || !secretData.secret) {
    console.warn('CSRF secret not found in cookies', {
      url: url.pathname,
      method: req.method,
      cookieNames: Object.keys(cookies).join(', '),
    })
    return false
  }
  
  // Verify token
  const isValid = verifyCsrfToken(secretData.secret, csrfToken)
  
  if (!isValid) {
    console.warn('CSRF token verification failed', {
      secretLength: secretData.secret.length,
      tokenLength: csrfToken.length,
      url: url.pathname,
      method: req.method,
      secret50: secretData.secret.substring(0, 5) + '...',
      token50: csrfToken.substring(0, 5) + '...',
    })
    
    // Cache the validation result (negative)
    validatedTokensCache.set(cacheKey, false)
    
    return false
  }
  
  // Check token age
  const tokenAge = Date.now() - secretData.createdAt
  const maxAge = 60 * 60 * 24 * 1000 // 1 day
  
  if (tokenAge > maxAge) {
    console.warn('CSRF token expired', {
      tokenAge: `${Math.round(tokenAge / 1000 / 60)} minutes`,
      maxAge: '24 hours',
      url: url.pathname,
    })
    
    // Cache the validation result (negative)
    validatedTokensCache.set(cacheKey, false)
    
    return false
  }
  
  // Cache the validation result (positive)
  validatedTokensCache.set(cacheKey, true)
  
  // Clear old cache entries periodically (keep only recent entries)
  if (validatedTokensCache.size > 100) {
    const keysToDelete = Array.from(validatedTokensCache.keys()).slice(0, 50)
    keysToDelete.forEach(key => validatedTokensCache.delete(key))
  }
  
  if (debug) {
    console.log('✅ CSRF token validation successful', {
      url: url.pathname,
      method: req.method,
    })
  } else {
    console.log('CSRF token validation successful')
  }
  return true
}