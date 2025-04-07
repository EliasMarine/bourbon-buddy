import { useState, useEffect, useCallback } from 'react'

export interface UseCsrfOptions {
  onTokenLoad?: (token: string | null) => void
  maxRetries?: number
}

export interface UseCsrfResult {
  csrfToken: string | null
  isLoading: boolean
  error: Error | null
  csrfHeaders: Record<string, string>
  addCsrfToFormData: (formData: FormData) => FormData
  refreshToken: () => Promise<void>
}

/**
 * Hook for managing CSRF tokens in forms
 */
export function useCsrf({ onTokenLoad, maxRetries = 3 }: UseCsrfOptions = {}): UseCsrfResult {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Fetch CSRF token from server with retry capability
  const fetchCsrfToken = useCallback(async (isRetry = false) => {
    try {
      if (isRetry) {
        // If we've exceeded max retries, don't try anymore
        if (retryCount >= maxRetries) {
          console.error(`Maximum retry attempts (${maxRetries}) reached for CSRF token fetch`)
          return
        }
        
        setRetryCount(prev => prev + 1)
      } else {
        // Reset retry count on fresh attempts
        setRetryCount(0)
      }
      
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
        console.log('CSRF token saved to sessionStorage', {
          tokenLength: data.csrfToken.length,
          cookieName: data.cookieName,
          isSecure: data.isSecure
        })
      } catch (err) {
        console.warn('Unable to store CSRF token in sessionStorage', err)
      }

      setError(null)
      return data.csrfToken
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(err instanceof Error ? err : new Error(errorMessage))
      console.error('Error fetching CSRF token:', errorMessage)
      
      // Schedule a retry with exponential backoff
      if (retryCount < maxRetries) {
        const backoff = Math.pow(2, retryCount) * 500 // 500ms, 1s, 2s, 4s, etc.
        console.log(`Retrying CSRF token fetch in ${backoff}ms (attempt ${retryCount + 1}/${maxRetries})`)
        
        setTimeout(() => {
          fetchCsrfToken(true)
        }, backoff)
      }
      
      return null
    } finally {
      setIsLoading(false)
    }
  }, [maxRetries, onTokenLoad, retryCount])

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
  }, [fetchCsrfToken, onTokenLoad])

  // Public method to manually refresh the token
  const refreshToken = useCallback(async () => {
    sessionStorage.removeItem('csrfToken')
    return fetchCsrfToken()
  }, [fetchCsrfToken])

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
      formData.append('_csrf', csrfToken) // Add alternative name for wider compatibility
    }
    return formData
  }

  return {
    csrfToken,
    isLoading,
    error,
    csrfHeaders,
    addCsrfToFormData,
    refreshToken
  }
} 