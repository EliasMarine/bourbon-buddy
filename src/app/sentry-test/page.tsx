'use client'

import * as Sentry from '@sentry/nextjs'
import { useState } from 'react'

export default function SentryTestPage() {
  const [errorTriggered, setErrorTriggered] = useState(false)
  const [eventId, setEventId] = useState<string | null>(null)

  // Function to trigger a handled error with context
  const triggerHandledError = () => {
    try {
      // Set user context for better error tracking
      Sentry.setUser({
        id: 'test-user-id',
        email: 'test@example.com',
        username: 'test-user'
      })

      // Add breadcrumbs for debugging
      Sentry.addBreadcrumb({
        category: 'test',
        message: 'User clicked "Trigger Handled Error" button',
        level: 'info'
      })

      // Add tags and context
      Sentry.setTag('test_type', 'handled_error')
      Sentry.setContext('additional_info', {
        origin: 'test button',
        timestamp: new Date().toISOString()
      })

      // Intentionally throw an error
      throw new Error('This is a test error for Sentry')
    } catch (error) {
      // Capture the error with Sentry
      if (error instanceof Error) {
        const eventId = Sentry.captureException(error)
        setEventId(eventId)
        setErrorTriggered(true)
      }
    }
  }

  // Function to trigger an unhandled error
  const triggerUnhandledError = () => {
    // Add context before throwing
    Sentry.setTag('test_type', 'unhandled_error')
    
    Sentry.addBreadcrumb({
      category: 'test',
      message: 'About to trigger unhandled error',
      level: 'fatal' // Set severity level in the breadcrumb
    })

    // Alert user that the page will crash
    alert('The page will crash in 1 second. This error will be caught by the error boundary and reported to Sentry.');
    
    // Use a small delay to ensure the alert is dismissed and context is set
    setTimeout(() => {
      // This will cause a real unhandled error
      // The error boundary should catch this
      throw new Error('This is an intentional unhandled error for Sentry testing');
    }, 1000);
  }

  // Function to trigger a CSP violation
  const triggerCSPViolation = () => {
    Sentry.addBreadcrumb({
      category: 'test',
      message: 'Attempting to trigger CSP violation',
      level: 'info'
    })

    try {
      // Create an inline script - this should violate CSP
      const script = document.createElement('script')
      script.innerHTML = 'console.log("This should trigger a CSP violation")'
      document.body.appendChild(script)

      // Notify user
      alert('CSP violation test executed. Check Sentry for results.')
    } catch (error) {
      console.error('Error triggering CSP violation:', error)
      alert('Failed to trigger CSP violation. See console for details.')
    }
  }

  // Function to test performance monitoring
  const triggerPerformanceIssue = () => {
    try {
      // Simulate an expensive operation
      const start = performance.now()
      while (performance.now() - start < 1000) {
        // Block the main thread for 1 second
      }

      Sentry.captureMessage('Performance test completed', {
        level: 'info',
        tags: {
          test_type: 'performance',
          duration_ms: Math.floor(performance.now() - start)
        }
      })

      alert('Performance test completed. Check Sentry for the event.')
    } catch (error) {
      if (error instanceof Error) {
        Sentry.captureException(error)
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Sentry Integration Test</h1>
      
      <div className="space-y-8">
        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Test 1: Handled Error</h2>
          <p className="mb-4 text-gray-700">This test will trigger a handled error and send it to Sentry with user context and breadcrumbs.</p>
          <button 
            onClick={triggerHandledError}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Trigger Handled Error
          </button>
          {errorTriggered && (
            <div className="mt-4">
              <p className="text-green-600 mb-2">
                ✅ Error triggered and sent to Sentry with Event ID: {eventId}
              </p>
              <button
                onClick={() => {
                  if (eventId) {
                    Sentry.showReportDialog({ eventId })
                  }
                }}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition text-sm"
                disabled={!eventId}
              >
                Provide User Feedback
              </button>
            </div>
          )}
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Test 2: Unhandled Error</h2>
          <p className="mb-4 text-gray-700">
            This test will trigger a real unhandled error. Your page will crash, but the error should be sent to Sentry.
          </p>
          <button 
            onClick={triggerUnhandledError}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Trigger Unhandled Error
          </button>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Test 3: CSP Violation</h2>
          <p className="mb-4 text-gray-700">
            This test will attempt to inject an inline script, which should trigger a CSP violation.
          </p>
          <button 
            onClick={triggerCSPViolation}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
          >
            Trigger CSP Violation
          </button>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Test 4: Performance Issue</h2>
          <p className="mb-4 text-gray-700">
            This test will simulate a performance issue by blocking the main thread for 1 second.
          </p>
          <button 
            onClick={triggerPerformanceIssue}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          >
            Trigger Performance Issue
          </button>
        </div>
      </div>

      <div className="mt-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Verification Steps</h2>
        <ol className="list-decimal pl-5 space-y-2 text-gray-700">
          <li>Click on each button to trigger different types of errors and performance issues.</li>
          <li>Visit your Sentry dashboard at <a href="https://sentry.io/" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">https://sentry.io/</a></li>
          <li>Check if the errors, CSP violations, and performance data appear in your project.</li>
          <li>Verify that error details, breadcrumbs, and user context are captured correctly.</li>
          <li>For the handled error, try providing user feedback through the feedback dialog.</li>
        </ol>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Note: Make sure your Sentry DSN is properly configured in your environment variables.</p>
      </div>
    </div>
  )
} 