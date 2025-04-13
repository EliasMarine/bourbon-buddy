'use client'

import { useState } from 'react'

export default function TestTunnelPage() {
  const [responseStatus, setResponseStatus] = useState<string>('')
  const [responseText, setResponseText] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  // Simple test that only runs when button is clicked
  const testTunnel = async () => {
    try {
      setIsLoading(true)
      setResponseStatus('')
      setResponseText('')

      // Create a basic envelope message
      const event = {
        event_id: generateUUID(),
        message: 'Test message from tunnel test page',
        level: 'info',
        timestamp: Math.floor(Date.now() / 1000),
      }

      // Convert to JSON string
      const eventJson = JSON.stringify(event)
      
      // Create Sentry envelope format
      // Format: Header\nItem header\nItem payload
      const eventHeader = JSON.stringify({
        event_id: event.event_id,
        sent_at: new Date().toISOString()
      })
      
      const itemHeader = JSON.stringify({ 
        type: 'event',
        length: eventJson.length 
      })
      
      const envelope = `${eventHeader}\n${itemHeader}\n${eventJson}`

      // Send to tunnel
      const response = await fetch('/api/sentry-tunnel', {
        method: 'POST',
        body: envelope,
        headers: {
          'Content-Type': 'application/x-sentry-envelope'
        },
        cache: 'no-store'
      })

      setResponseStatus(`Status: ${response.status} ${response.statusText}`)
      
      const text = await response.text()
      setResponseText(`Response: ${text}`)
      
      console.log('Tunnel test response:', { status: response.status, text })
    } catch (error) {
      console.error('Error testing tunnel:', error)
      setResponseStatus('Error: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to generate a UUID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white shadow-lg rounded-lg my-12">
      <h1 className="text-2xl font-bold mb-6">Sentry Tunnel Test</h1>
      
      <p className="mb-6 text-gray-700">
        This simplified page tests if the Sentry tunnel API route is working correctly.
      </p>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <button 
          onClick={testTunnel}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Sentry Tunnel'}
        </button>
      </div>
      
      {responseStatus && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Tunnel Test Result</h2>
          <p className="font-mono text-sm">{responseStatus}</p>
          {responseText && <p className="mt-2 font-mono text-sm whitespace-pre-wrap">{responseText}</p>}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-yellow-800">About Sentry Errors</h2>
        <p className="text-sm text-yellow-700 mb-2">
          The 502 Bad Gateway errors are likely caused by AdGuard blocking Sentry domains. You'll need to whitelist:
        </p>
        <ul className="list-disc pl-6 text-yellow-700 space-y-1 text-sm">
          <li>sentry.io</li>
          <li>*.sentry.io</li>
          <li>ingest.sentry.io</li>
        </ul>
      </div>
    </div>
  )
} 