'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CsrfFormWrapper } from './csrf-form-wrapper'
import { useCsrf } from '@/hooks/use-csrf'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { signInWithProxyEndpoint } from '@/lib/supabase-singleton'

interface LoginFormProps {
  callbackUrl?: string
  className?: string
}

export function LoginForm({ callbackUrl = '/dashboard', className = '' }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const router = useRouter()
  const { supabase, refreshSession } = useSupabase()
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>, csrfHeaders: Record<string, string>) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)
      setDebugInfo(null)
      
      console.log('🔍 Login attempt:', { email, timestamp: new Date().toISOString() })
      
      // Validate form inputs
      if (!email || !password) {
        const validationError = 'Please enter both email and password'
        console.log('⚠️ Validation error:', validationError)
        setError(validationError)
        return
      }
      
      console.log('✅ Form validation passed, attempting authentication via proxy...')
      
      try {
        // Use the specialized proxy endpoint that avoids CORS issues
        const response = await fetch('/api/auth/login-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...csrfHeaders
          },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
          mode: 'same-origin'
        })
        
        const result = await response.json()
        
        if (!response.ok) {
          let errorMessage = result.error || 'Login failed. Please check your credentials.'
          console.error('Login error:', errorMessage, response.status)
          setError(errorMessage)
          
          // Add more debugging context in non-production environments
          if (process.env.NODE_ENV !== 'production') {
            setDebugInfo({
              status: response.status,
              statusText: response.statusText,
              error: result.error,
              details: result.details,
              timestamp: new Date().toISOString()
            })
          }
          return
        }
        
        // Success - we have a session
        console.log('Login successful, setting session data')
        
        // Even with a successful authentication, explicitly set the session
        if (result?.session) {
          try {
            // Explicitly set session in the Supabase client to ensure auth state is updated
            await supabase.auth.setSession({
              access_token: result.session.access_token,
              refresh_token: result.session.refresh_token,
            })
            
            // Store session data also in localStorage as a fallback
            try {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
              const prefix = supabaseUrl.includes('.')
                ? supabaseUrl.split('//')[1]?.split('.')[0]
                : ''
              
              const storageKey = `sb-${prefix}-auth-token`
              localStorage.setItem(storageKey, JSON.stringify({
                access_token: result.session.access_token,
                refresh_token: result.session.refresh_token,
                expires_at: Math.floor(Date.now() / 1000) + (result.session.expires_in || 3600),
                user: result.user
              }))
              
              console.log('Session data also stored in localStorage')
            } catch (storageError) {
              console.warn('Could not store session in localStorage:', storageError)
            }
          } catch (sessionError) {
            console.error('Error setting session:', sessionError)
            // Continue anyway as the auth cookie should still be set
          }
        }
        
        // Refresh user session in context
        refreshSession()
                
        // Sometimes the router.push doesn't work immediately after auth
        // Set a small timeout to ensure auth state has propagated
        setTimeout(() => {
          router.push(callbackUrl)
        }, 100)
        
      } catch (error) {
        console.error('Login form error:', error)
        setError('An unexpected error occurred. Please try again.')
      } finally {
        setLoading(false)
      }
    } catch (err) {
      console.error('🔥 Unexpected login error:', err)
      setError('An unexpected error occurred. Please try again.')
      setDebugInfo({
        unexpectedError: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString()
      })
    }
  }
  
  return (
    <CsrfFormWrapper onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <p className="text-sm text-red-700">{error}</p>
            {debugInfo && (
              <details className="mt-2 text-xs text-gray-500">
                <summary>Debug information (click to expand)</summary>
                <pre className="mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </div>
    </CsrfFormWrapper>
  )
} 