'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CsrfFormWrapper } from './csrf-form-wrapper'
import { useCsrf } from '@/hooks/use-csrf'

interface LoginFormProps {
  callbackUrl?: string
  className?: string
}

export function LoginForm({ callbackUrl = '/dashboard', className = '' }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>, csrfHeaders: Record<string, string>) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)
      
      // Validate form inputs
      if (!email || !password) {
        setError('Please enter both email and password')
        return
      }
      
      // Send login request with CSRF token
      const response = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders
        },
        body: JSON.stringify({ email, password, callbackUrl }),
      })
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMessage = data.message || `Login failed with status ${response.status}`
        setError(errorMessage)
        
        // If it's a CSRF error, reload the page to get a fresh token
        if (response.status === 403 && data.message?.includes('CSRF')) {
          setTimeout(() => window.location.reload(), 2000)
        }
        
        return
      }
      
      // Successful login, redirect
      const data = await response.json()
      router.push(data.url || callbackUrl)
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
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