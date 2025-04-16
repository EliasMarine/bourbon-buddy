import { NextRequest, NextResponse } from 'next/server'
import { setCorsHeaders } from '@/lib/cors'

interface DiagnosticResult {
  test: string
  status: 'success' | 'warning' | 'error'
  message: string
  details?: any
}

export async function GET(req: NextRequest) {
  try {
    const results: DiagnosticResult[] = []
    
    // 1. Check if environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    results.push({
      test: 'Environment Variables',
      status: (supabaseUrl && supabaseKey) ? 'success' : 'error',
      message: (supabaseUrl && supabaseKey) 
        ? 'Supabase environment variables are set' 
        : 'Missing Supabase environment variables',
      details: {
        supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'Not set',
        supabaseKey: supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'Not set'
      }
    })
    
    // 2. JWT Structure Check
    if (supabaseKey) {
      try {
        const parts = supabaseKey.split('.')
        
        if (parts.length !== 3) {
          results.push({
            test: 'JWT Structure',
            status: 'error',
            message: 'Supabase anon key is not a valid JWT',
            details: {
              parts: parts.length,
              expected: 3
            }
          })
        } else {
          // Basic header check
          const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
          
          // Check JWT expiration
          const now = Math.floor(Date.now() / 1000)
          const isExpired = payload.exp && payload.exp < now
          
          results.push({
            test: 'JWT Structure',
            status: isExpired ? 'error' : 'success',
            message: isExpired ? 'JWT token is expired' : 'JWT token structure is valid',
            details: {
              header: {
                alg: header.alg,
                typ: header.typ
              },
              payload: {
                role: payload.role,
                iss: payload.iss ? payload.iss.substring(0, 20) + '...' : 'Not set',
                exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'Not set',
                iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'Not set',
                expiresIn: payload.exp ? Math.floor((payload.exp * 1000 - Date.now()) / (1000 * 60 * 60 * 24)) + ' days' : 'Unknown'
              }
            }
          })
        }
      } catch (e: any) {
        results.push({
          test: 'JWT Structure',
          status: 'error',
          message: 'Failed to parse JWT token',
          details: {
            error: e.message
          }
        })
      }
    }
    
    // 3. Cookie access test
    try {
      const cookies = req.cookies.getAll()
      results.push({
        test: 'Cookie Access',
        status: 'success',
        message: `Successfully accessed cookies (${cookies.length} found)`,
        details: {
          cookieCount: cookies.length,
          hasAccessToken: cookies.some(c => c.name === 'sb-access-token'),
          hasRefreshToken: cookies.some(c => c.name === 'sb-refresh-token')
        }
      })
    } catch (e: any) {
      results.push({
        test: 'Cookie Access',
        status: 'error',
        message: 'Failed to access cookies',
        details: {
          error: e.message
        }
      })
    }
    
    // 4. CORS settings check
    const origin = req.headers.get('origin')
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000']
    
    results.push({
      test: 'CORS Settings',
      status: 'success', // We're not validating here, just reporting
      message: 'CORS settings information',
      details: {
        origin: origin || 'Not provided',
        allowedOrigins,
        isOriginAllowed: !origin || allowedOrigins.includes(origin),
        environment: process.env.NODE_ENV || 'Not set'
      }
    })
    
    // 5. Network connectivity check to Supabase
    if (supabaseUrl) {
      try {
        const startTime = Date.now()
        const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey || ''
          }
        })
        const endTime = Date.now()
        
        const data = await response.json()
        
        results.push({
          test: 'Supabase Connectivity',
          status: response.ok ? 'success' : 'error',
          message: response.ok 
            ? `Successfully connected to Supabase (${endTime - startTime}ms)` 
            : `Failed to connect to Supabase: ${response.statusText}`,
          details: {
            status: response.status,
            data
          }
        })
        
        // 6. Test authentication format
        // This doesn't use real credentials, just tests the API format
        if (response.ok) {
          try {
            const authStartTime = Date.now()
            const testEmail = 'test@example.com'
            const testPassword = 'invalid_password_for_testing'
            
            const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey || ''
              },
              body: JSON.stringify({
                email: testEmail,
                password: testPassword
              })
            })
            const authEndTime = Date.now()
            
            let authData
            try {
              authData = await authResponse.json()
            } catch (jsonError) {
              authData = { parseError: 'Failed to parse JSON response' }
            }
            
            // We expect a 400 or 401 error here since we're using fake credentials
            // What's important is to verify the response format 
            const expectedErrorStatus = [400, 401].includes(authResponse.status)
            
            results.push({
              test: 'Auth API Format',
              status: expectedErrorStatus ? 'success' : 'warning',
              message: expectedErrorStatus 
                ? `Auth API responding correctly with expected error (${authEndTime - authStartTime}ms)` 
                : `Unexpected auth response status: ${authResponse.status}`,
              details: {
                status: authResponse.status,
                responseFormat: authData && typeof authData === 'object' 
                  ? 'Valid JSON' 
                  : 'Invalid format',
                hasErrorField: !!authData?.error,
                error: authData?.error || 'None',
                errorDescription: authData?.error_description || 'None'
              }
            })
          } catch (authError: any) {
            results.push({
              test: 'Auth API Format',
              status: 'error',
              message: 'Failed to test auth API format',
              details: {
                error: authError.message
              }
            })
          }
        }
      } catch (e: any) {
        results.push({
          test: 'Supabase Connectivity',
          status: 'error',
          message: 'Failed to connect to Supabase',
          details: {
            error: e.message
          }
        })
      }
    }
    
    // Create response with all diagnostic results
    const response = NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'success',
      environment: process.env.NODE_ENV || 'Not set',
      results
    })
    
    // Set CORS headers
    setCorsHeaders(req, response)
    return response
  } catch (error: any) {
    console.error('Auth status diagnostic error:', error)
    
    const response = NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      message: 'Failed to run authentication diagnostics',
      error: error.message
    }, { status: 500 })
    
    setCorsHeaders(req, response)
    return response
  }
} 