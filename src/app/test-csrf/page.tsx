'use client'

import { useState } from 'react'
import { CsrfToken } from '@/components/CsrfToken'

export default function TestCsrfPage() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<null | 'success' | 'failure'>(null)
  const [testResult, setTestResult] = useState('')
  const [headers, setHeaders] = useState<Record<string, string>>({})

  // Handle the CSRF token loaded from the CsrfToken component
  const handleTokenLoad = (token: string | null) => {
    setCsrfToken(token)
    if (token) {
      setHeaders({
        'x-csrf-token': token,
        'csrf-token': token,
        'X-CSRF-Token': token,
        'content-type': 'application/json'
      })
    }
  }

  // Test a basic POST request with the CSRF token
  const testCsrfSubmission = async () => {
    try {
      setTestStatus(null)
      setTestResult('Testing...')

      // Create a test API endpoint to validate CSRF (we'll use a simple echo endpoint)
      const response = await fetch('/api/csrf/test', {
        method: 'POST',
        headers,
        body: JSON.stringify({ test: 'data' })
      })

      const data = await response.json()
      
      if (response.ok) {
        setTestStatus('success')
        setTestResult(JSON.stringify(data, null, 2))
      } else {
        setTestStatus('failure')
        setTestResult(`Error: ${response.status} - ${JSON.stringify(data, null, 2)}`)
      }
    } catch (error) {
      setTestStatus('failure')
      setTestResult(`Exception: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <CsrfToken onTokenLoad={handleTokenLoad}>
      <div className="container mx-auto py-8">
        <div className="max-w-md mx-auto bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="text-xl font-semibold">CSRF Protection Test</h2>
            <p className="text-sm text-gray-600">
              Test if CSRF token generation and validation is working correctly
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="csrf-token" className="block text-sm font-medium">Current CSRF Token:</label>
              <input 
                id="csrf-token" 
                value={csrfToken || 'Loading...'} 
                readOnly 
                className="w-full px-3 py-2 border rounded-md font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Headers That Will Be Sent:</label>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(headers, null, 2)}
              </pre>
            </div>
            {testStatus && (
              <div className={`p-4 rounded ${testStatus === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                <h3 className="font-medium mb-2">
                  {testStatus === 'success' ? 'Success!' : 'Test Failed'}
                </h3>
                <pre className="text-xs overflow-auto whitespace-pre-wrap">
                  {testResult}
                </pre>
              </div>
            )}
          </div>
          <div className="p-5 bg-gray-50">
            <button 
              onClick={testCsrfSubmission} 
              disabled={!csrfToken}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Test CSRF Submission
            </button>
          </div>
        </div>
      </div>
    </CsrfToken>
  )
} 