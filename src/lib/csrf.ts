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

// Get the appropriate cookie name based on environment
export const getCsrfCookieName = () => {
  return 'csrf_secret'
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
    return tokens.verify(secret, token)
  } catch (error) {
    console.error('CSRF verification error:', error)
    return false
  }
}

// Create cookie with CSRF secret
export function createCsrfCookie(secret: string, createdAt: number) {
  const isProduction = process.env.NODE_ENV === 'production'
  
  return serialize(CSRF_COOKIE_NAME, JSON.stringify({ secret, createdAt }), {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 // 1 day
  })
}

// Parse cookies from string
export function parseCookies(cookieString: string) {
  const cookies: Record<string, string> = {}
  
  if (cookieString) {
    cookieString.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=')
      if (name && value) {
        cookies[name] = decodeURIComponent(value)
      }
    })
  }
  
  return cookies
}

// Extract CSRF secret from cookies
export function extractCsrfSecret(cookies: Record<string, string>) {
  try {
    const csrfCookie = cookies[CSRF_COOKIE_NAME]
    
    if (csrfCookie) {
      try {
        return JSON.parse(csrfCookie)
      } catch (error) {
        // Fallback to using the cookie value directly
        return { 
          secret: csrfCookie,
          createdAt: Date.now()
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error extracting CSRF secret:', error)
    return null
  }
}

// Middleware helper to validate CSRF tokens
export function validateCsrfToken(req: Request, csrfToken?: string) {
  // Skip validation in development if enabled
  if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_CSRF === 'true') {
    return true
  }
  
  // Extract CSRF token from header if not provided
  if (!csrfToken) {
    csrfToken = req.headers.get('x-csrf-token') || 
               req.headers.get('csrf-token') || 
               req.headers.get('X-CSRF-Token') || 
               undefined
    
    // For GET requests, CSRF validation isn't strictly necessary
    if (!csrfToken && req.method === 'GET') {
      return true
    }
    
    if (!csrfToken) {
      console.warn('CSRF token missing from request headers')
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
  const secretData = extractCsrfSecret(cookies)
  
  if (!secretData || !secretData.secret) {
    console.warn('CSRF secret not found in cookies')
    return false
  }
  
  // Verify token
  const isValid = verifyCsrfToken(secretData.secret, csrfToken)
  
  if (!isValid) {
    console.warn('CSRF token verification failed')
    return false
  }
  
  // Check token age
  const tokenAge = Date.now() - secretData.createdAt
  const maxAge = 60 * 60 * 24 * 1000 // 1 day
  
  if (tokenAge > maxAge) {
    console.warn('CSRF token expired')
    return false
  }
  
  return true
}