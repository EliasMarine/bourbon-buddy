import { useState } from 'react'

interface SignupParams {
  email: string
  password: string
  username: string
  name?: string
}

interface SignupResult {
  user: any
  session: any
}

interface ValidationError {
  field: string
  message: string
}

interface SignupHookReturn {
  signup: (params: SignupParams) => Promise<SignupResult>
  isLoading: boolean
  error: string | null
  validationErrors: ValidationError[]
  clearErrors: () => void
}

/**
 * Custom hook for handling user signup
 * Manages loading state, validation, and error handling
 */
export function useSignup(): SignupHookReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])

  const clearErrors = () => {
    setError(null)
    setValidationErrors([])
  }

  // Function to handle signup validation and API call
  const signup = async ({ email, password, username, name }: SignupParams): Promise<SignupResult> => {
    try {
      clearErrors()
      setIsLoading(true)

      // Client-side validation
      const errors: ValidationError[] = []

      if (!email) {
        errors.push({ field: 'email', message: 'Email is required' })
      } else if (!/^\S+@\S+\.\S+$/.test(email)) {
        errors.push({ field: 'email', message: 'Please enter a valid email address' })
      }

      if (!username) {
        errors.push({ field: 'username', message: 'Username is required' })
      } else if (username.length < 3) {
        errors.push({ field: 'username', message: 'Username must be at least 3 characters' })
      } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        errors.push({ field: 'username', message: 'Username can only contain letters, numbers, underscores and hyphens' })
      }

      if (!password) {
        errors.push({ field: 'password', message: 'Password is required' })
      } else if (password.length < 8) {
        errors.push({ field: 'password', message: 'Password must be at least 8 characters' })
      }

      if (errors.length > 0) {
        setValidationErrors(errors)
        throw new Error('Validation failed')
      }

      // Get CSRF token if available in browser environment
      let csrfHeaders = {}
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const csrfToken = window.sessionStorage.getItem('csrfToken')
        if (csrfToken) {
          csrfHeaders = { 'X-CSRF-Token': csrfToken }
        }
      }

      // Prepare the request body
      const requestBody = {
        email: email.trim(),
        password,
        username: username.trim(),
        name: name?.trim()
      }

      // Final safety check to ensure we're sending all required fields
      if (!requestBody.email || !requestBody.password || !requestBody.username) {
        console.error('Critical error: Missing required fields for signup after validation', { 
          hasEmail: !!requestBody.email,
          hasPassword: !!requestBody.password,
          hasUsername: !!requestBody.username
        });
        setError('Unable to process signup: Missing required fields');
        throw new Error('Missing required fields for signup');
      }

      console.log('Sending signup request with validated data')
      
      // Make the API request
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders
        },
        body: JSON.stringify(requestBody),
        credentials: 'include'
      })

      // Parse the response
      const result = await response.json()

      // Handle error responses
      if (!response.ok) {
        console.error('Signup request failed:', result)
        
        // Handle specific error types
        if (result.error?.includes('already registered') || result.error?.includes('already exists')) {
          setError('An account with this email already exists')
        } else if (result.error?.includes('password')) {
          setValidationErrors([{ field: 'password', message: result.error }])
        } else {
          setError(result.error || 'Failed to create account')
        }
        
        throw new Error(result.error || 'Signup failed')
      }

      // Success case
      return {
        user: result.user,
        session: result.session
      }
    } catch (err: any) {
      // If we haven't already set a specific error, set a generic one
      if (!error && err.message !== 'Validation failed') {
        setError(err.message || 'An unexpected error occurred')
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    signup,
    isLoading,
    error,
    validationErrors,
    clearErrors
  }
}

export default useSignup 