import { NextRequest, NextResponse } from 'next/server'
import { createCsrfCookie, generateCsrfToken } from '@/lib/csrf'

// GET /api/csrf - Generate a new CSRF token
export async function GET(request: NextRequest) {
  try {
    // Generate a new CSRF token and secret
    const { secret, token, createdAt } = generateCsrfToken()
    
    // Create a cookie with the secret
    const cookieHeader = createCsrfCookie(secret, createdAt)
    
    // Return the token in the response
    const response = NextResponse.json({ csrfToken: token })
    
    // Set the cookie
    response.headers.set('Set-Cookie', cookieHeader)
    
    return response
  } catch (error) {
    console.error('Error generating CSRF token:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
} 