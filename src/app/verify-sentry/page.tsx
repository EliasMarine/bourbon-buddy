'use client'

import * as Sentry from '@sentry/nextjs'
import { useState, useEffect } from 'react'

export default function VerifySentryPage() {
  const [eventId, setEventId] = useState<string | null>(null)
  const [apiResponse, setApiResponse] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorDetails, setErrorDetails] = useState<Record<string, any> | null>(null)

  useEffect(() => {
    // Log that the test page has loaded to the console
    console.log('[Sentry Test] Page loaded at', new Date().toISOString())
    
    // Add a breadcrumb for debugging
    Sentry.addBreadcrumb({
      category: 'test',
      message: 'Verify Sentry page loaded',
      level: 'info'
    })
    
    // Verify the DSN is set correctly
    console.log('[Sentry Test] DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN)
  }, [])

  const triggerClientError = () => {
    try {
      setIsLoading(true)
      
      // Add context information
      Sentry.setTag('test_source', 'client_button')
      Sentry.setContext('test_details', {
        timestamp: new Date().toISOString(),
        source: 'verify-sentry client error button',
        userAgent: navigator.userAgent
      })
      
      // Deliberately throw an error
      throw new Error(`Test client error from verify-sentry page at ${new Date().toISOString()}`)
    } catch (error) {
      if (error instanceof Error) {
        // Explicitly capture the error
        const id = Sentry.captureException(error)
        console.log('[Sentry Test] Error captured with ID:', id)
        
        // Store error details for display
        setErrorDetails({
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        })
        
        // Set the event ID for display
        setEventId(id)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const triggerApiError = async () => {
    try {
      setIsLoading(true)
      setApiResponse(null)
      
      // Call the API route that triggers an error
      const response = await fetch('/api/test-sentry')
      const data = await response.json()
      
      // Display the API response
      setApiResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('[Sentry Test] API error:', error)
      setApiResponse(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  const verifyConfig = () => {
    try {
      // Send a test message to Sentry
      const id = Sentry.captureMessage('Verify Sentry config test message', {
        level: 'info',
        tags: {
          test_type: 'config_verification',
          timestamp: new Date().toISOString()
        }
      })
      
      console.log('[Sentry Test] Test message sent with ID:', id)
      alert(`Test message sent to Sentry with ID: ${id}`)
    } catch (error) {
      console.error('[Sentry Test] Failed to send test message:', error)
      alert(`Error sending test message: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg my-8">
      <h1 className="text-3xl font-bold mb-6">Sentry Verification Page</h1>
      
      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h2 className="text-xl font-semibold mb-2 text-blue-800">Important Notes</h2>
        <ul className="list-disc pl-6 space-y-2 text-blue-700">
          <li>Check your browser console to see debug messages and verify errors are being captured</li>
          <li>The Sentry debug mode is enabled, so you should see detailed logs in the console</li>
          <li>After triggering errors, check your Sentry dashboard to see if they appear</li>
          <li>Some browsers may block the requests to Sentry - check your network tab for any blocked requests</li>
        </ul>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Test 1: Client-Side Error</h2>
          <p className="mb-4 text-gray-700">
            This will throw and capture a client-side error with context information.
          </p>
          <button 
            onClick={triggerClientError}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Trigger Client Error'}
          </button>
          
          {eventId && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">Error captured with Event ID: {eventId}</p>
              <p className="text-sm text-green-700 mt-1">Check your Sentry dashboard for this event.</p>
              
              {errorDetails && (
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(errorDetails, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
        
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Test 2: Server-Side API Error</h2>
          <p className="mb-4 text-gray-700">
            This will trigger an error in a server-side API route that should be captured by Sentry.
          </p>
          <button 
            onClick={triggerApiError}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Trigger API Error'}
          </button>
          
          {apiResponse && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 font-medium">API Response:</p>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                {apiResponse}
              </pre>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold mb-4">Test 3: Verify Configuration</h2>
        <p className="mb-4 text-gray-700">
          Send a test message to Sentry to verify your configuration is working correctly.
        </p>
        <button 
          onClick={verifyConfig}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Send Test Message
        </button>
      </div>
      
      <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
        <h2 className="text-xl font-semibold mb-4 text-yellow-800">Troubleshooting Tips</h2>
        <ul className="list-disc pl-6 space-y-2 text-yellow-700">
          <li>Make sure your Sentry DSN is correctly set in your .env.local file</li>
          <li>Check that you don't have any ad-blockers or privacy extensions blocking requests to sentry.io</li>
          <li>Verify in the Network tab that requests to sentry.io are being sent and succeed with 200 status</li>
          <li>If you're seeing events in the console but not in Sentry, you might have reached your quota or have filtering rules in place</li>
          <li>Try accessing your Sentry dashboard in an incognito window to rule out cache issues</li>
        </ul>
      </div>
    </div>
  )
} 