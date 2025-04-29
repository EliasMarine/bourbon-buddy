'use client'

import React, { createContext, useContext, useState } from 'react'

// CSRF context type
interface CsrfContextType {
  csrfToken: string | null
  setCsrfToken: (token: string | null) => void
}

// Create context with default values
const CsrfContext = createContext<CsrfContextType>({
  csrfToken: null,
  setCsrfToken: () => {}
})

// Provider props
interface CsrfProviderProps {
  children: React.ReactNode
  initialToken?: string | null
}

/**
 * Provider component for CSRF token
 * This sets up the CSRF token state and provides it to descendants
 */
export function CsrfProvider({ children, initialToken = null }: CsrfProviderProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(initialToken)

  // Add CSRF token to outgoing fetch/XHR requests
  React.useEffect(() => {
    if (!csrfToken) return

    const originalFetch = window.fetch

    // Override the global fetch function to add CSRF token to requests
    window.fetch = async (input, init?) => {
      // Clone init to avoid modifying the original object
      const modifiedInit = init ? { ...init } : {}
      
      // Skip for GET requests
      if (modifiedInit.method === undefined || modifiedInit.method?.toUpperCase() === 'GET') {
        return originalFetch(input, modifiedInit)
      }

      // Only add CSRF token for same-origin or API requests (not third-party analytics)
      let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const isSameOrigin = url.startsWith('/') || url.startsWith(window.location.origin)
      const isApiRequest = url.includes('/api/')
      const isAnalytics = url.includes('inferred.litix.io')

      if (csrfToken && (isSameOrigin || isApiRequest) && !isAnalytics) {
        console.log(`Adding CSRF token to ${modifiedInit.method} request to ${url}`)
        modifiedInit.headers = {
          ...(modifiedInit.headers || {}),
          'X-CSRF-Token': csrfToken
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
  }, [csrfToken])

  return (
    <CsrfContext.Provider value={{ csrfToken, setCsrfToken }}>
      {children}
    </CsrfContext.Provider>
  )
}

/**
 * Hook to access CSRF token
 */
export function useCsrfToken() {
  const context = useContext(CsrfContext)
  
  if (!context) {
    throw new Error('useCsrfToken must be used within a CsrfProvider')
  }
  
  return context
}

export default CsrfProvider