'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CsrfFormWrapper } from './csrf-form-wrapper'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import useSignup from '@/hooks/use-signup'

interface SignupFormProps {
  callbackUrl?: string
  className?: string
}

interface ValidationError {
  field: string
  message: string
}

export function SignupForm({ callbackUrl = '/dashboard', className = '' }: SignupFormProps) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = useSupabase()
  
  // Use our custom signup hook
  const { signup, isLoading, error, validationErrors, clearErrors } = useSignup()
  
  // Clear errors when form fields change
  useEffect(() => {
    if (error || validationErrors.length > 0) {
      clearErrors()
    }
  }, [email, password, username, name])
  
  const handleSubmit = async (e: FormEvent<HTMLFormElement>, csrfHeaders: Record<string, string>) => {
    e.preventDefault()
    
    try {
      // Use our signup hook to handle the signup process
      await signup({
        email,
        password,
        username,
        name
      })
      
      console.log('✅ Signup successful, syncing user with database...')
      
      // Sync user with database after successful signup
      try {
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
          // Continue even if sync fails - user will be synced on next auth
        } else {
          console.log('✅ User sync successful')
        }
      } catch (syncError) {
        console.error('❌ User sync error:', syncError)
        // Continue even if sync fails
      }
      
      // Successful signup
      setSuccess(true)
      
      // Redirect to login page after successful signup
      setTimeout(() => {
        router.push('/login?newAccount=true')
      }, 3000) // Slightly longer delay to give user time to read success message
    } catch (err) {
      // Error handling is now done inside the useSignup hook
      console.error('🔥 Signup error:', err)
    }
  }
  
  // Get field error message if exists
  const getFieldError = (field: string) => {
    const error = validationErrors.find(e => e.field === field)
    return error ? error.message : null
  }
  
  // Show success state
  if (success) {
    return (
      <div className="bg-green-50 p-6 rounded-md text-center">
        <h3 className="text-lg font-medium text-green-800">Account created successfully!</h3>
        <p className="mt-2 text-sm text-green-700">
          Please check your email for a verification link. You must verify your email before logging in.
        </p>
        <p className="mt-4 text-xs text-green-600">
          Redirecting you to login page in a moment...
        </p>
      </div>
    )
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
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={`mt-1 block w-full px-3 py-2 border ${getFieldError('email') ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {getFieldError('email') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            className={`mt-1 block w-full px-3 py-2 border ${getFieldError('username') ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {getFieldError('username') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('username')}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className={`mt-1 block w-full px-3 py-2 border ${getFieldError('password') ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {getFieldError('password') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('password')}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Password must be at least 10 characters and include uppercase, lowercase, number, and special character.
          </p>
        </div>
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className={`mt-1 block w-full px-3 py-2 border ${getFieldError('name') ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {getFieldError('name') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
          )}
        </div>
        
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </div>
      </div>
    </CsrfFormWrapper>
  )
} 