'use client'

import React, { useEffect, useState } from 'react'
import { useSupabase } from './providers'

interface CsrfTokenProps {
  children: React.ReactNode
  onTokenLoad?: (token: string | null) => void
}

/**
 * Component that loads and manages CSRF token for forms
 * This component fetches the CSRF token from the server and makes it available
 * to child components via the onTokenLoad callback
 */
export function CsrfToken({ children, onTokenLoad }: CsrfTokenProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { nonce } = useSupabase()

  useEffect(() => {
    // Try to get token from session storage first
    const storedToken = sessionStorage.getItem('csrfToken')
    
    if (storedToken) {
      setCsrfToken(storedToken)
      onTokenLoad?.(storedToken)
      setIsLoading(false)
      console.log('Using CSRF token from sessionStorage')
      return
    }
    
    // If no token in storage, fetch a new one
    async function fetchCsrfToken() {
      try {
        const response = await fetch('/api/csrf', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store',
          },
          cache: 'no-store',
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.csrfToken) {
            // Store token in session storage for future use
            sessionStorage.setItem('csrfToken', data.csrfToken)
            setCsrfToken(data.csrfToken)
            onTokenLoad?.(data.csrfToken)
            console.log('CSRF token loaded successfully', data)
          } else {
            console.error('No CSRF token found in response')
            onTokenLoad?.(null)
          }
        } else {
          console.error('Failed to fetch CSRF token:', response.status)
          onTokenLoad?.(null)
        }
      } catch (error) {
        console.error('Error fetching CSRF token:', error)
        onTokenLoad?.(null)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCsrfToken()
  }, [onTokenLoad])

  // Render loading state or children
  return (
    <>
      {isLoading ? (
        <div className="text-center p-4" nonce={nonce}>
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
              Loading...
            </span>
          </div>
        </div>
      ) : (
        children
      )}
    </>
  )
}

export default CsrfToken