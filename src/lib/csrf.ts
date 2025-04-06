import { serialize } from 'cookie'
import Tokens from 'csrf'

const tokens = new Tokens()

// Generate a CSRF token
export const generateCsrfToken = () => {
  const secret = tokens.secretSync()
  const token = tokens.create(secret)
  
  return { secret, token }
}

// Verify a CSRF token
export const verifyCsrfToken = (secret: string, token: string) => {
  return tokens.verify(secret, token)
}

// Create a cookie with the CSRF secret
export const createCsrfCookie = (secret: string) => {
  return serialize('csrf_secret', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 // 1 day
  })
}

// Parse cookies from string
export const parseCookies = (cookieString: string) => {
  const cookies: Record<string, string> = {}
  if (cookieString) {
    cookieString.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=')
      cookies[name] = decodeURIComponent(value)
    })
  }
  return cookies
}