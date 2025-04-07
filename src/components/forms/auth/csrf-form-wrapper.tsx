'use client'

import { useEffect, FormEvent, ReactNode } from 'react'
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit(e, csrfHeaders)
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 my-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Security Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Unable to load security token. Please refresh the page or try again later.</p>
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