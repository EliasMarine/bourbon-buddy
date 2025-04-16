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
  
  // Set secure in production, but allow non-secure in development
  const secure = process.env.NODE_ENV === 'production';
  
  // Configure cookie options for better security and browser compatibility
  const cookieOptions = [
    `${cookieName}=${encodeURIComponent(cookieValue)}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`, // Changed from Strict to Lax for better usability across origins
    ...(secure ? [`Secure`] : []),
    // Max-age of 7 days
    `Max-Age=${60 * 60 * 24 * 7}`
  ];
  
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
    console.warn('CSRF cookie not found. Available cookies:', Object.keys(cookies))
    return null
  }
  
  try {
    // Try to parse it as JSON (new format)
    const parsed = JSON.parse(csrfCookieValue)
    return {
      secret: parsed.secret,
      createdAt: parsed.createdAt
    }
  } catch (e) {
    // Fallback to assuming it's just the secret string (old format)
    return {
      secret: csrfCookieValue,
      createdAt: Date.now() - 60000 // Assume it's 1 minute old
    }
  }
}

// Middleware helper to validate CSRF tokens
export function validateCsrfToken(req: Request, csrfToken?: string) {
  // Skip validation in development if enabled
  if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_CSRF === 'true') {
    console.log('CSRF validation bypassed in development mode')
    return true
  }

  const url = new URL(req.url)
  console.log('Validating CSRF token for request:', {
    method: req.method,
    path: url.pathname,
    hasToken: !!csrfToken,
  })
  
  // Extract CSRF token from header if not provided
  if (!csrfToken) {
    csrfToken = req.headers.get('x-csrf-token') || 
               req.headers.get('csrf-token') || 
               req.headers.get('X-CSRF-Token') || 
               undefined
    
    // For GET requests, CSRF validation isn't strictly necessary
    if (!csrfToken && req.method === 'GET') {
      console.log('Skipping CSRF validation for GET request')
      return true
    }
    
    if (!csrfToken) {
      console.warn('CSRF token missing from request headers', {
        headers: Array.from(req.headers.keys()),
      })
      return false
    }
  }
  
  // Get cookies from request
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) {
    console.warn('No cookies found in request')
    return false
  }
  
  // Extract CSRF secret from cookies
  const cookies = parseCookies(cookieHeader)
  console.log('Cookies found in request:', {
    cookieCount: Object.keys(cookies).length,
    cookieNames: Object.keys(cookies),
    hasCsrfCookie: !!cookies[getCsrfCookieName()],
  })
  
  const secretData = extractCsrfSecret(cookies)
  
  if (!secretData || !secretData.secret) {
    console.warn('CSRF secret not found in cookies')
    return false
  }
  
  // Verify token
  const isValid = verifyCsrfToken(secretData.secret, csrfToken)
  
  if (!isValid) {
    console.warn('CSRF token verification failed', {
      secretLength: secretData.secret.length,
      tokenLength: csrfToken.length,
    })
    return false
  }
  
  // Check token age
  const tokenAge = Date.now() - secretData.createdAt
  const maxAge = 60 * 60 * 24 * 1000 // 1 day
  
  if (tokenAge > maxAge) {
    console.warn('CSRF token expired', {
      tokenAge: `${Math.round(tokenAge / 1000 / 60)} minutes`,
      maxAge: '24 hours'
    })
    return false
  }
  
  console.log('CSRF token validation successful')
  return true
}