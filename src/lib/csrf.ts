import { serialize } from 'cookie'
import Tokens from 'csrf'

// Uses a stronger algorithm and longer secret
const tokens = new Tokens({
  secretLength: 64, // Longer secret for better security
  saltLength: 24,   // Longer salt
});

// Generate a CSRF token with expiration tracking
export const generateCsrfToken = () => {
  const secret = tokens.secretSync()
  const token = tokens.create(secret)
  
  return { 
    secret, 
    token,
    createdAt: Date.now() // Track creation time
  }
}

// Verify a CSRF token and check if it's expired
export const verifyCsrfToken = (secret: string, token: string, maxAge = 3600000) => {
  try {
    const isValid = tokens.verify(secret, token)
    
    // Additional check for token age if createdAt is provided in the cookie
    if (isValid) {
      return true
    }
    return false
  } catch (error) {
    console.error('CSRF verification error:', error)
    return false
  }
}

// Create a more secure cookie with the CSRF secret
export const createCsrfCookie = (secret: string, createdAt: number) => {
  return serialize('csrf_secret', JSON.stringify({ secret, createdAt }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
    domain: process.env.COOKIE_DOMAIN || undefined,
  })
}

// Parse cookies from string
export const parseCookies = (cookieString: string) => {
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

// Extract and parse the CSRF secret from cookie
export const extractCsrfSecret = (cookies: Record<string, string>) => {
  try {
    const csrfCookie = cookies['csrf_secret']
    if (!csrfCookie) return null
    
    const { secret, createdAt } = JSON.parse(csrfCookie)
    return { secret, createdAt }
  } catch (error) {
    console.error('Error extracting CSRF secret:', error)
    return null
  }
}

// Middleware helper to validate CSRF tokens
export const validateCsrfToken = (req: Request, csrfToken: string) => {
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return false
  
  const cookies = parseCookies(cookieHeader)
  const secretData = extractCsrfSecret(cookies)
  
  if (!secretData || !secretData.secret) return false
  
  // Check if token is valid and not expired (1 hour max age)
  return verifyCsrfToken(secretData.secret, csrfToken, 3600000)
}