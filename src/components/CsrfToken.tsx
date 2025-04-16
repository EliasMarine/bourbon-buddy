'use client'

import { useState, useEffect, useCallback } from 'react'

interface CsrfTokenProps {
  children: React.ReactNode
  onTokenLoad?: (token: string | null) => void
}

// Define a custom interface to extend XMLHttpRequest
interface ExtendedXMLHttpRequest extends XMLHttpRequest {
  _csrfMethod?: string
  _csrfUrl?: string | URL
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
      
      // Use enhanced fetch with better error handling and timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store', // Prevent caching
        headers: {
          'Cache-Control': 'no-cache'
        },
        // Add signal for timeout control
        signal: controller.signal
      }).finally(() => {
        clearTimeout(timeoutId)
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
        sessionStorage.setItem('csrfTokenTimestamp', Date.now().toString())
        // Also store the cookie name for debugging
        if (data.cookieName) {
          sessionStorage.setItem('csrfCookieName', data.cookieName)
        }
      } catch (err) {
        console.warn('Unable to store CSRF token in sessionStorage', err)
      }

      // Enhanced logging with response details
      console.log(`CSRF token loaded successfully ${data.status ? data.status : ''}`, {
        cookieName: data.cookieName,
        tokenAvailable: !!data.csrfToken,
        tokenLength: data.csrfToken?.length
      })
      setError(null)
    } catch (err) {
      // Extract meaningful error information for debugging
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      const isAborted = err instanceof DOMException && err.name === 'AbortError'
      const isCorsError = errorMessage.includes('CORS') || 
                          errorMessage.includes('NetworkError') ||
                          errorMessage.includes('Failed to fetch')
      
      console.error(`Error fetching CSRF token: ${errorMessage}`, {
        isTimeout: isAborted,
        isCorsError,
        retryCount
      })
      
      setError(err instanceof Error ? err : new Error(errorMessage))
      
      // Try to retrieve from sessionStorage if available
      try {
        const storedToken = sessionStorage.getItem('csrfToken')
        const timestamp = sessionStorage.getItem('csrfTokenTimestamp')
        const tokenAge = timestamp ? (Date.now() - parseInt(timestamp, 10)) : Infinity
        
        // Use stored token if it exists and is less than 24 hours old
        if (storedToken && tokenAge < 24 * 60 * 60 * 1000) {
          console.log('Retrieved CSRF token from sessionStorage (age: ' + Math.round(tokenAge / 60000) + ' minutes)')
          setCsrfToken(storedToken)
          if (onTokenLoad) onTokenLoad(storedToken)
          
          // Don't clear the error to indicate we're using a fallback
          setIsLoading(false)
          return
        } else if (storedToken) {
          console.log('Stored CSRF token is too old or invalid')
        }
      } catch (storageErr) {
        console.warn('Unable to access sessionStorage', storageErr)
      }
      
      // Only retry for network/CORS errors, not for other types of errors
      if (retryCount < MAX_RETRIES && (isCorsError || isAborted)) {
        console.log(`Retrying CSRF token fetch (${retryCount + 1}/${MAX_RETRIES})...`)
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000) // Exponential backoff with 10s max
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, delay)
      } else if (retryCount >= MAX_RETRIES) {
        // Generate a fallback token after max retries
        // This is a temporary solution to prevent completely locking out the user
        try {
          const fallbackToken = `fallback-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`
          console.warn('Using fallback CSRF token after multiple failures')
          setCsrfToken(fallbackToken)
          if (onTokenLoad) onTokenLoad(fallbackToken)
          sessionStorage.setItem('csrfToken', fallbackToken)
          sessionStorage.setItem('csrfTokenTimestamp', Date.now().toString())
          sessionStorage.setItem('csrfTokenIsFallback', 'true')
        } catch (fallbackErr) {
          console.error('Failed to create fallback CSRF token', fallbackErr)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [onTokenLoad, retryCount])

  // Try to get token from sessionStorage on initial load
  useEffect(() => {
    try {
      const storedToken = sessionStorage.getItem('csrfToken')
      if (storedToken) {
        console.log('Using CSRF token from sessionStorage')
        setCsrfToken(storedToken)
        if (onTokenLoad) onTokenLoad(storedToken)
        setIsLoading(false)
      }
    } catch (err) {
      console.warn('Unable to access sessionStorage', err)
    }
    
    fetchCsrfToken()
  }, [fetchCsrfToken, onTokenLoad])

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
        
        // Skip CSRF token for Supabase auth requests 
        // These are handled by our custom proxy
        const isSupabaseAuth = 
          requestUrl.toString().includes('supabase') && 
          requestUrl.toString().includes('/auth/v1/');
        
        const shouldAddToken = isSameOrigin && 
                               !['GET', 'HEAD', 'OPTIONS'].includes(method) &&
                               !isSupabaseAuth;
        
        if (shouldAddToken) {
          init = init || {}
          init.headers = new Headers(init.headers || {})
          
          // Add token in multiple formats to ensure compatibility
          init.headers.set('x-csrf-token', csrfToken)
          init.headers.set('csrf-token', csrfToken)
          init.headers.set('X-CSRF-Token', csrfToken)
          
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

  // Add CSRF token to XMLHttpRequest
  useEffect(() => {
    if (!csrfToken) return

    const originalXhrOpen = XMLHttpRequest.prototype.open
    const originalXhrSend = XMLHttpRequest.prototype.send

    XMLHttpRequest.prototype.open = function(this: ExtendedXMLHttpRequest, method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
      try {
        // Store method and URL for later use
        this._csrfMethod = method.toUpperCase()
        this._csrfUrl = url
      } catch (error) {
        console.error('Error in XMLHttpRequest open override:', error)
      }
      return originalXhrOpen.call(this, method, url, async, username || null, password || null)
    } as typeof XMLHttpRequest.prototype.open

    XMLHttpRequest.prototype.send = function(this: ExtendedXMLHttpRequest, body: Document | XMLHttpRequestBodyInit | null) {
      try {
        // Only add for non-GET requests to same origin
        const method = this._csrfMethod || 'GET'
        let isSameOrigin = true
        let isSupabaseAuth = false

        if (this._csrfUrl) {
          const urlStr = typeof this._csrfUrl === 'string' ? this._csrfUrl : this._csrfUrl.toString()
          const requestUrl = new URL(urlStr, window.location.origin)
          isSameOrigin = requestUrl.origin === window.location.origin
          
          // Skip CSRF token for Supabase auth requests
          isSupabaseAuth = urlStr.includes('supabase') && urlStr.includes('/auth/v1/')
        }

        if (isSameOrigin && !isSupabaseAuth && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
          this.setRequestHeader('x-csrf-token', csrfToken)
          this.setRequestHeader('csrf-token', csrfToken)
          this.setRequestHeader('X-CSRF-Token', csrfToken)
          console.log(`Adding CSRF token to XHR ${method} request`)
        }
      } catch (error) {
        console.error('Error in XMLHttpRequest send override:', error)
      }
      return originalXhrSend.apply(this, [body])
    }

    return () => {
      XMLHttpRequest.prototype.open = originalXhrOpen
      XMLHttpRequest.prototype.send = originalXhrSend
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