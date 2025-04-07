import { serialize } from 'cookie'
import Tokens from 'csrf'
import { nanoid } from 'nanoid'

// Uses a stronger algorithm and longer secret
const tokens = new Tokens({
  secretLength: 64, // Longer secret for better security
  saltLength: 24,   // Longer salt
});

// Get the appropriate cookie name based on environment
export const getCsrfCookieName = () => {
  return 'csrf_secret'
}

// Also support NextAuth's CSRF token
export const getNextAuthCsrfCookieName = () => {
  return 'next-auth.csrf-token'
}

// Generate a CSRF token with expiration tracking
export const generateCsrfToken = () => {
  // Use nanoid for more secure tokens
  const secret = nanoid(64) || tokens.secretSync()
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
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieName = getCsrfCookieName()
  
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  }
  
  return serialize(cookieName, JSON.stringify({ secret, createdAt }), cookieOptions)
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
    // First try our own CSRF cookie
    const cookieName = getCsrfCookieName()
    let csrfCookie = cookies[cookieName]
    
    if (csrfCookie) {
      const { secret, createdAt } = JSON.parse(csrfCookie)
      return { secret, createdAt }
    }
    
    // If not found, try NextAuth's CSRF token
    const nextAuthCsrfName = getNextAuthCsrfCookieName()
    csrfCookie = cookies[nextAuthCsrfName]
    
    if (csrfCookie) {
      // NextAuth stores the token in format: token|timestamp
      const [token, timestamp] = csrfCookie.split('|')
      if (token) {
        // Use the token itself as the secret for validation
        return { 
          secret: token, 
          createdAt: timestamp ? parseInt(timestamp, 10) : Date.now()
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
export const validateCsrfToken = (req: Request, csrfToken?: string) => {
  try {
    // Skip validation in development if BYPASS_CSRF=true
    if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_CSRF === 'true') {
      console.warn('BYPASSING CSRF VALIDATION IN DEVELOPMENT MODE');
      return true;
    }
    
    // Extract CSRF token from various headers if not provided directly
    if (!csrfToken) {
      // Check for token in different header formats
      const xCsrfToken = req.headers.get('x-csrf-token');
      const csrfTokenHeader = req.headers.get('csrf-token');
      const xCsrfTokenUpper = req.headers.get('X-CSRF-Token');
      
      csrfToken = xCsrfToken || csrfTokenHeader || xCsrfTokenUpper || undefined;
      
      if (!csrfToken) {
        console.warn('CSRF token missing from request headers', {
          headers: Array.from(req.headers.keys()),
          url: req.url,
          method: req.method
        });
        return false;
      }
    }
    
    const cookieHeader = req.headers.get('cookie');
    if (!cookieHeader) {
      console.warn('No cookies found in request', {
        url: req.url,
        method: req.method
      });
      return false;
    }
    
    const cookies = parseCookies(cookieHeader);
    const secretData = extractCsrfSecret(cookies);
    
    // Debug log for cookie inspection
    console.log('CSRF cookie check:', {
      cookies: Object.keys(cookies),
      foundSecret: !!secretData
    });
    
    if (!secretData || !secretData.secret) {
      console.warn('CSRF secret not found in cookies', {
        cookieNames: Object.keys(cookies)
      });
      return false;
    }
    
    // For NextAuth token, use token as both secret and token 
    // since we're using the token itself as the secret
    const isNextAuthToken = !cookies[getCsrfCookieName()] && cookies[getNextAuthCsrfCookieName()];
    const isValid = isNextAuthToken 
      ? secretData.secret === csrfToken 
      : tokens.verify(secretData.secret, csrfToken);
    
    if (!isValid) {
      console.warn('CSRF token verification failed', {
        tokenLength: csrfToken?.length || 0,
        secretLength: secretData.secret?.length || 0,
        isNextAuthToken
      });
      return false;
    }
    
    // Check expiration (if createdAt is available)
    if (secretData.createdAt) {
      const tokenAge = Date.now() - secretData.createdAt;
      const isExpired = tokenAge > 3600000 * 24; // 24 hours
      
      if (isExpired) {
        console.warn('CSRF token expired', {
          age: tokenAge,
          createdAt: new Date(secretData.createdAt).toISOString()
        });
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return false;
  }
}