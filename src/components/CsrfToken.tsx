'use client'

import { useState, useEffect } from 'react'
import { verifyCsrfToken } from '@/lib/csrf'

interface CsrfTokenProps {
  children: React.ReactNode
  onTokenLoad?: (token: string | null) => void
}

export function CsrfToken({ children, onTokenLoad }: CsrfTokenProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchCsrfToken() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/csrf', {
          method: 'GET',
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch CSRF token')
        }

        const data = await response.json()
        setCsrfToken(data.csrfToken)
        
        if (onTokenLoad) {
          onTokenLoad(data.csrfToken)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
        console.error('Error fetching CSRF token:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCsrfToken()
  }, [onTokenLoad])

  // Add CSRF token to all non-GET fetch requests
  useEffect(() => {
    if (!csrfToken) return

    const originalFetch = window.fetch
    window.fetch = function(input, init) {
      // Only add CSRF token to same-origin requests
      let requestUrl: URL
      
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
      }
      
      return originalFetch.call(window, input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [csrfToken])

  if (isLoading) {
    return <div className="text-center">Loading CSRF protection...</div>
  }

  if (error) {
    return <div className="text-red-500">Failed to load CSRF protection</div>
  }

  return <>{children}</>
}