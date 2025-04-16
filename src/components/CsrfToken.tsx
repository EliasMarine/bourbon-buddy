'use client'

import React, { useEffect, useContext, createContext, useState, PropsWithChildren } from 'react'

// CSRF token context type
interface CsrfContextType {
  csrfToken: string | null
  isLoading: boolean
  error: string | null
}

// CSRF provider props
interface CsrfTokenProps {
  children: React.ReactNode
  refreshInterval?: number
  fetchOnMount?: boolean
}

// Create context with default values
const CsrfContext = createContext<CsrfContextType>({
  csrfToken: null,
  isLoading: false,
  error: null,
})

// Token refresh interval in minutes (default is 60 min)
const DEFAULT_REFRESH_INTERVAL = 60

/**
 * Custom hook to access CSRF token
 */
export const useCsrfToken = () => useContext(CsrfContext)

/**
 * CSRF Token Provider Component - Manages CSRF token lifecycle
 */
export function CsrfToken({ 
  children, 
  refreshInterval = DEFAULT_REFRESH_INTERVAL,
  fetchOnMount = true,
}: CsrfTokenProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<number>(0)

  // Fetch a new CSRF token from the server
  const fetchCsrfToken = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Add cache busting query parameter
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/csrf?_t=${timestamp}`, {
        method: 'GET',
        credentials: 'include', // Important: include cookies
        headers: {
          // Prevent caching
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.csrfToken || typeof data.csrfToken !== 'string') {
        throw new Error('Invalid CSRF token received')
      }
      
      // Store token in sessionStorage for persistence and access from other components
      try {
        sessionStorage.setItem('csrfToken', data.csrfToken)
        sessionStorage.setItem('csrfTokenTimestamp', Date.now().toString())
        
        // Also store origin for debugging cross-origin issues
        sessionStorage.setItem('csrfTokenOrigin', window.location.origin)
        
        console.log('Stored CSRF token in sessionStorage', {
          tokenLength: data.csrfToken.length,
          tokenStart: data.csrfToken.substring(0, 5) + '...',
          origin: window.location.origin,
          host: window.location.host
        })
      } catch (storageError) {
        console.warn('Unable to store CSRF token in sessionStorage:', storageError)
      }
      
      setCsrfToken(data.csrfToken)
      setLastFetched(Date.now())
      console.log('CSRF token loaded successfully', { 
        cookieName: data.cookieName,
        tokenAvailable: !!data.csrfToken,
        tokenLength: data.csrfToken?.length || 0,
        status: data.status
      })
    } catch (fetchError) {
      console.error('Error fetching CSRF token:', fetchError)
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error')
      
      // Try to recover by using existing token if available
      try {
        const existingToken = sessionStorage.getItem('csrfToken')
        if (existingToken) {
          setCsrfToken(existingToken)
          console.warn('Failed to fetch new CSRF token, using existing one from storage')
        }
      } catch (storageError) {
        console.error('Unable to access sessionStorage:', storageError)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Add CSRF token to outgoing fetch/XHR requests
  useEffect(() => {
    const originalFetch = window.fetch

    // Override the global fetch function to add CSRF token to requests
    window.fetch = async (input, init?) => {
      // Clone init to avoid modifying the original object
      const modifiedInit = init ? { ...init } : {}
      
      // Skip for GET requests
      if (modifiedInit.method === undefined || modifiedInit.method?.toUpperCase() === 'GET') {
        return originalFetch(input, modifiedInit)
      }

      // Add CSRF token to headers if not present and token is available
      const token = sessionStorage.getItem('csrfToken')
      
      if (token) {
        console.log('Adding CSRF token to POST request to', typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)
        modifiedInit.headers = {
          ...(modifiedInit.headers || {}),
          'x-csrf-token': token,
          'csrf-token': token,
          'X-CSRF-Token': token,
        }
      }

      try {
        return await originalFetch(input, modifiedInit)
      } catch (error) {
        console.error('Fetch error with CSRF token:', error)
        throw error
      }
    }

    // Clean up the override when component unmounts
    return () => {
      window.fetch = originalFetch
    }
  }, [])

  // Initialize token on mount and refresh periodically
  useEffect(() => {
    let storedToken: string | null = null
    let storedTimestamp: string | null = null

    // Try to get token from sessionStorage
    try {
      storedToken = sessionStorage.getItem('csrfToken')
      storedTimestamp = sessionStorage.getItem('csrfTokenTimestamp')
      
      if (storedToken) {
        console.log('Using CSRF token from sessionStorage')
        setCsrfToken(storedToken)
        setIsLoading(false)
        
        // Check if token needs refresh
        if (storedTimestamp) {
          const timestamp = parseInt(storedTimestamp, 10)
          const now = Date.now()
          const age = now - timestamp
          const maxAge = refreshInterval * 60 * 1000 // Convert minutes to milliseconds
          
          if (age > maxAge && fetchOnMount) {
            console.log('CSRF token expired, fetching new one')
            fetchCsrfToken()
          } else {
            setLastFetched(timestamp)
          }
        }
      } else if (fetchOnMount) {
        // No token in storage, fetch a new one
        fetchCsrfToken()
      } else {
        setIsLoading(false)
      }
    } catch (storageError) {
      console.warn('Unable to access sessionStorage:', storageError)
      
      if (fetchOnMount) {
        fetchCsrfToken()
      } else {
        setIsLoading(false)
      }
    }

    // Set up token refresh interval
    const intervalId = setInterval(() => {
      const tokenAge = Date.now() - lastFetched
      const maxAge = refreshInterval * 60 * 1000 // Convert minutes to milliseconds
      
      if (tokenAge > maxAge) {
        console.log('Refreshing CSRF token')
        fetchCsrfToken()
      }
    }, 60 * 1000) // Check every minute

    return () => clearInterval(intervalId)
  }, [refreshInterval, lastFetched, fetchOnMount])

  return (
    <CsrfContext.Provider value={{ csrfToken, isLoading, error }}>
      {children}
    </CsrfContext.Provider>
  )
}