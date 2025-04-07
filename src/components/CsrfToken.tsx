'use client'

import { useState, useEffect, useCallback } from 'react'

interface CsrfTokenProps {
  children: React.ReactNode
  onTokenLoad?: (token: string | null) => void
}

export function CsrfToken({ children, onTokenLoad }: CsrfTokenProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 3

  const fetchCsrfToken = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store', // Prevent caching
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
      
      // Enhanced logging with response details
      console.log(`CSRF token loaded successfully ${data.status ? data.status : ''}`, {
        cookieName: data.cookieName,
        tokenAvailable: !!data.csrfToken
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      console.error('Error fetching CSRF token:', err)
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying CSRF token fetch (${retryCount + 1}/${MAX_RETRIES})...`)
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, 1000 * (retryCount + 1)) // Exponential backoff
      }
    } finally {
      setIsLoading(false)
    }
  }, [onTokenLoad, retryCount])

  useEffect(() => {
    fetchCsrfToken()
  }, [fetchCsrfToken])

  // Add CSRF token to all non-GET fetch requests
  useEffect(() => {
    if (!csrfToken) return

    const originalFetch = window.fetch
    window.fetch = function(input, init) {
      // Only add CSRF token to same-origin requests
      let requestUrl: URL
      
      try {
        if (typeof input === 'string') {
          requestUrl = new URL(input, window.location.origin)
        } else if (input instanceof URL) {
          requestUrl = input
        } else {
          // It's a Request object
          requestUrl = new URL(input.url)
        }
        
        const isSameOrigin = requestUrl.origin === window.location.origin
        
        // Skip for GET, HEAD, OPTIONS requests
        const method = init?.method?.toUpperCase() || 'GET'
        const shouldAddToken = isSameOrigin && !['GET', 'HEAD', 'OPTIONS'].includes(method)
        
        if (shouldAddToken) {
          init = init || {}
          init.headers = new Headers(init.headers || {})
          init.headers.set('x-csrf-token', csrfToken)
          
          // For debugging
          console.log(`Adding CSRF token to ${method} request to ${requestUrl.pathname}`)
        }
      } catch (error) {
        console.error('Error in CSRF fetch override:', error)
      }
      
      return originalFetch.call(window, input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [csrfToken])

  if (isLoading && retryCount === 0) {
    return <div className="text-center text-xs">Loading security tokens...</div>
  }

  if (error && retryCount >= MAX_RETRIES) {
    return (
      <div className="text-red-500 text-xs p-2">
        <p>Security error: Unable to load CSRF protection</p>
        <button 
          onClick={() => {
            setRetryCount(0)
            fetchCsrfToken()
          }}
          className="text-blue-500 underline text-xs mt-1"
        >
          Retry
        </button>
      </div>
    )
  }

  return <>{children}</>
}