'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report the error to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="max-w-4xl mx-auto p-8 bg-red-50 rounded-lg border border-red-100 my-8">
      <h2 className="text-2xl font-bold text-red-800 mb-4">Error Caught By Boundary</h2>
      <p className="mb-4 text-red-700">
        The Sentry test page encountered an error that was caught by the error boundary.
        This prevents the page from refreshing endlessly.
      </p>
      <div className="bg-white p-4 rounded mb-4 overflow-auto max-h-48">
        <p className="font-mono text-sm">
          {error.message}
          <br />
          {error.stack}
        </p>
      </div>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Try Again
        </button>
        <a 
          href="/sentry-test"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Reload Page
        </a>
      </div>
      <p className="mt-4 text-gray-600 text-sm">
        This error has been automatically reported to Sentry.
      </p>
    </div>
  )
} 