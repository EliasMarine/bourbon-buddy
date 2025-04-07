import { useState, useEffect } from 'react'

export interface UseCsrfOptions {
  onTokenLoad?: (token: string | null) => void
}

export interface UseCsrfResult {
  csrfToken: string | null
  isLoading: boolean
  error: Error | null
  csrfHeaders: Record<string, string>
  addCsrfToFormData: (formData: FormData) => FormData
}

/**
 * Hook for managing CSRF tokens in forms
 */
export function useCsrf({ onTokenLoad }: UseCsrfOptions = {}): UseCsrfResult {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Try to get token from sessionStorage on initial load
  useEffect(() => {
    try {
      const storedToken = sessionStorage.getItem('csrfToken')
      if (storedToken) {
        console.log('Using CSRF token from sessionStorage')
        setCsrfToken(storedToken)
        if (onTokenLoad) onTokenLoad(storedToken)
        setIsLoading(false)
      } else {
        fetchCsrfToken()
      }
    } catch (err) {
      console.warn('Unable to access sessionStorage', err)
      fetchCsrfToken()
    }
  }, [onTokenLoad])

  // Fetch CSRF token from server
  const fetchCsrfToken = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.csrfToken) {
        throw new Error('No CSRF token in response')
      }
      
      setCsrfToken(data.csrfToken)
      
      if (onTokenLoad) {
        onTokenLoad(data.csrfToken)
      }
      
      // Store token in sessionStorage for persistence across page navigations
      try {
        sessionStorage.setItem('csrfToken', data.csrfToken)
      } catch (err) {
        console.warn('Unable to store CSRF token in sessionStorage', err)
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      console.error('Error fetching CSRF token:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Create headers object with CSRF token
  const csrfHeaders = {
    'x-csrf-token': csrfToken || '',
    'csrf-token': csrfToken || '',
    'X-CSRF-Token': csrfToken || '',
    'content-type': 'application/json'
  }

  // Helper function to add CSRF token to FormData
  const addCsrfToFormData = (formData: FormData): FormData => {
    if (csrfToken) {
      formData.append('csrfToken', csrfToken)
    }
    return formData
  }

  return {
    csrfToken,
    isLoading,
    error,
    csrfHeaders,
    addCsrfToFormData
  }
} 