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
        const response = await fetch('/api/auth/csrf', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store',
          },
          cache: 'no-store',
          credentials: 'include', // Important for cookies
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.csrfToken) {
            // Store token in session storage for future use
            sessionStorage.setItem('csrfToken', data.csrfToken)
            setCsrfToken(data.csrfToken)
            onTokenLoad?.(data.csrfToken)
            console.log('CSRF token loaded successfully')
            
            // Also make it globally available for fetch calls
            window._csrfToken = data.csrfToken;
          } else {
            console.error('No CSRF token found in response')
            onTokenLoad?.(null)
          }
        } else {
          console.error('Failed to fetch CSRF token:', response.status)
          onTokenLoad?.(null)
          
          // Generate a fallback token if server fails
          generateFallbackToken();
        }
      } catch (error) {
        console.error('Error fetching CSRF token:', error)
        onTokenLoad?.(null)
        
        // Generate a fallback token if server fails
        generateFallbackToken();
      } finally {
        setIsLoading(false)
      }
    }
    
    function generateFallbackToken() {
      try {
        // Generate a simple client-side token as fallback
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        const fallbackToken = `fb-${timestamp}-${random}`;
        
        sessionStorage.setItem('csrfToken', fallbackToken);
        setCsrfToken(fallbackToken);
        onTokenLoad?.(fallbackToken);
        console.log('Using fallback CSRF token');
        
        // Also make it globally available for fetch calls
        window._csrfToken = fallbackToken;
      } catch (e) {
        console.error('Error generating fallback token:', e);
      }
    }
    
    fetchCsrfToken()
  }, [onTokenLoad])

  // Add global fetch override to include CSRF token
  useEffect(() => {
    if (!csrfToken) return;
    
    const originalFetch = window.fetch;
    
    window.fetch = function(input, init) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method?.toUpperCase() || 'GET';
      
      // Only add CSRF token for non-GET requests to our own API
      if (method !== 'GET' && (url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`))) {
        const headers = new Headers(init?.headers || {});
        
        // Add CSRF token if not already present
        if (!headers.has('x-csrf-token')) {
          headers.set('x-csrf-token', csrfToken);
        }
        
        // Update init with new headers
        init = {
          ...init,
          headers
        };
      }
      
      return originalFetch(input, init);
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, [csrfToken]);

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

// Add global type definition for the CSRF token
declare global {
  interface Window {
    _csrfToken?: string;
  }
}

export default CsrfToken