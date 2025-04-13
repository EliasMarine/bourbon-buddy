'use client'

import * as Sentry from '@sentry/nextjs'
import { useState } from 'react'

export default function TestSentryPage() {
  const [errorTriggered, setErrorTriggered] = useState(false)
  const [eventId, setEventId] = useState<string | null>(null)

  const triggerError = () => {
    try {
      // Add user context for better tracking
      Sentry.setUser({
        id: 'test-user-id',
        email: 'test@example.com',
        username: 'test-user'
      })

      // Add breadcrumbs for debugging
      Sentry.addBreadcrumb({
        category: 'test',
        message: 'User clicked "Trigger Error" button',
        level: 'info'
      })

      // Add tags and context
      Sentry.setTag('test_type', 'manual_error')
      Sentry.setContext('additional_info', {
        origin: 'test page',
        timestamp: new Date().toISOString()
      })

      // Throw a test error
      throw new Error('This is a test error from the new test page')
    } catch (error) {
      // Capture the error with Sentry
      if (error instanceof Error) {
        const id = Sentry.captureException(error)
        console.log('Error captured with Sentry event ID:', id)
        setEventId(id)
        setErrorTriggered(true)
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white shadow-lg rounded-lg my-12">
      <h1 className="text-3xl font-bold mb-6">Sentry Test Page</h1>
      
      <p className="mb-6 text-gray-600">
        This is a simple page to test if your Sentry integration is working properly.
        Click the button below to trigger a test error that will be sent to Sentry.
      </p>
      
      <button 
        onClick={triggerError}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Trigger Test Error
      </button>

      {errorTriggered && (
        <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded">
          <p className="text-green-800">
            ✅ Error triggered and sent to Sentry
          </p>
          {eventId && (
            <p className="text-sm text-gray-600 mt-2">
              Event ID: {eventId}
            </p>
          )}
          <p className="text-sm mt-2">
            Check your Sentry dashboard to see if the error was received.
          </p>
        </div>
      )}
    </div>
  )
} 