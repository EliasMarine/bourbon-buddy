'use client'

import { useEffect, FormEvent, ReactNode, useState } from 'react'
import { useCsrf } from '@/hooks/use-csrf'
import { CsrfToken } from '@/components/CsrfToken'

interface CsrfFormWrapperProps {
  children: ReactNode
  onSubmit: (e: FormEvent<HTMLFormElement>, csrfHeaders: Record<string, string>) => void
  className?: string
}

/**
 * A form wrapper that automatically handles CSRF token inclusion for auth forms
 */
export function CsrfFormWrapper({ children, onSubmit, className = '' }: CsrfFormWrapperProps) {
  const { csrfToken, isLoading, error, csrfHeaders } = useCsrf()
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 3

  useEffect(() => {
    // Log some debugging information to help diagnose issues
    if (error) {
      console.error('CSRF Error in form wrapper:', error)
    }

    if (csrfToken) {
      console.log('CSRF token available in form wrapper', {
        tokenLength: csrfToken.length,
        headersSet: Object.keys(csrfHeaders).length > 0,
        headers: Object.keys(csrfHeaders),
        timestamp: new Date().toISOString()
      })
    } else if (!isLoading) {
      console.warn('No CSRF token available and not in loading state', {
        error: error?.message,
        retryCount,
        timestamp: new Date().toISOString()
      })
    }
  }, [csrfToken, error, csrfHeaders, isLoading, retryCount])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!csrfToken) {
      console.error('⚠️ Attempting to submit form without CSRF token', {
        isLoading,
        hasError: !!error,
        errorMessage: error?.message,
        retryCount,
        timestamp: new Date().toISOString()
      })
    } else {
      console.log('🔒 Form submission with CSRF token', {
        tokenLength: csrfToken.length,
        headers: Object.keys(csrfHeaders),
        timestamp: new Date().toISOString()
      })
    }
    
    // Log all form data being submitted (except password)
    const formData = new FormData(e.target as HTMLFormElement)
    const formValues: Record<string, string> = {}
    
    formData.forEach((value, key) => {
      if (key !== 'password' && key !== 'currentPassword' && key !== 'newPassword') {
        formValues[key] = typeof value === 'string' ? value : '[File or complex value]'
      } else {
        formValues[key] = '********'
      }
    })
    
    console.log('📝 Form data being submitted:', formValues)
    
    onSubmit(e, csrfHeaders)
  }

  const retryFetch = () => {
    console.log('🔄 Manually retrying CSRF token fetch', {
      currentRetryCount: retryCount,
      maxRetries: MAX_RETRIES,
      timestamp: new Date().toISOString()
    })
    
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1)
      // This will trigger a re-render and the useCsrf hook will attempt to fetch again
    }
  }

  if (error && retryCount >= MAX_RETRIES) {
    console.error('❌ CSRF token fetch failed after maximum retries', {
      maxRetries: MAX_RETRIES,
      error: error.message,
      timestamp: new Date().toISOString()
    })
    
    return (
      <div className="rounded-md bg-red-50 p-4 my-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Security Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Unable to load security token. Please refresh the page or try again later.</p>
              <details className="mt-2 text-xs">
                <summary>Error details</summary>
                <p className="mt-1">{error.message}</p>
              </details>
              <button 
                onClick={retryFetch}
                className="text-blue-500 underline text-xs mt-2"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <CsrfToken>
      <form onSubmit={handleSubmit} className={className}>
        {/* Hidden CSRF token input for traditional form submissions */}
        <input type="hidden" name="csrfToken" value={csrfToken || ''} />
        <input type="hidden" name="_csrf" value={csrfToken || ''} />
        
        {/* Show loading state or the form content */}
        {isLoading ? (
          <div className="text-center py-4">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-2 text-sm text-gray-600">Loading security tokens...</p>
          </div>
        ) : (
          children
        )}
      </form>
    </CsrfToken>
  )
} 