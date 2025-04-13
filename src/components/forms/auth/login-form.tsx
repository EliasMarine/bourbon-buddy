'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CsrfFormWrapper } from './csrf-form-wrapper'
import { useCsrf } from '@/hooks/use-csrf'
import { useSupabase } from '@/components/providers/SupabaseProvider'

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
  const supabase = useSupabase()
  
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
      
      console.log('✅ Form validation passed, attempting Supabase authentication...')
      
      // Sign in with Supabase
      const authResult = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      // Log everything about the auth result for debugging
      console.log('🔐 Supabase auth response:', JSON.stringify({
        data: authResult.data,
        error: authResult.error ? {
          message: authResult.error.message,
          name: authResult.error.name,
          status: authResult.error.status,
          code: authResult.error?.code
        } : null
      }, null, 2))
      
      const { data, error: signInError } = authResult
      
      if (signInError) {
        const errorMsg = signInError.message || 'Failed to sign in'
        
        // Set detailed debug info
        setDebugInfo({
          errorCode: signInError.code,
          errorName: signInError.name,
          errorStatus: signInError.status,
          errorMessage: signInError.message,
          timestamp: new Date().toISOString()
        })
        
        console.error('❌ Login error:', {
          message: errorMsg,
          code: signInError.code,
          name: signInError.name,
          status: signInError.status
        })
        
        // Show more user-friendly error messages
        if (errorMsg.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again or reset your password if you forgot it.')
        } else if (errorMsg.includes('Email not confirmed')) {
          setError('Please verify your email address before signing in. Check your inbox for a verification link.')
        } else {
          setError(errorMsg)
        }
        
        return
      }
      
      // Log user info on success (partial, for privacy)
      if (data?.user) {
        console.log('✅ Login successful:', {
          userId: data.user.id,
          email: data.user.email?.substring(0, 3) + '***',
          hasSession: !!data.session,
          timestamp: new Date().toISOString()
        })
        
        // Sync user with database - critical step to prevent auth/DB sync issues
        try {
          console.log('🔄 Syncing user with database...')
          const syncResponse = await fetch('/api/auth/sync-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...csrfHeaders
            }
          })
          
          if (!syncResponse.ok) {
            console.warn('⚠️ User sync failed:', {
              status: syncResponse.status,
              statusText: syncResponse.statusText
            })
            // Continue with redirection even if sync fails
            // The middleware will handle future requests
          } else {
            console.log('✅ User sync successful')
          }
        } catch (syncError) {
          console.error('❌ User sync error:', syncError)
          // Continue with redirection even if sync fails
        }
      }
      
      console.log('🔄 Redirecting to:', callbackUrl)
      
      // Successful login, redirect
      router.push(callbackUrl)
      router.refresh()
    } catch (err) {
      console.error('🔥 Unexpected login error:', err)
      setError('An unexpected error occurred. Please try again.')
      setDebugInfo({
        unexpectedError: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
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