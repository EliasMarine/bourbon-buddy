'use client'

import { useState, useEffect } from 'react'
import { useCsrf } from '@/hooks/use-csrf'

export function CsrfClientTest() {
  const { csrfToken, isLoading, error, csrfHeaders } = useCsrf()
  const [testResults, setTestResults] = useState<any>(null)
  const [isTestLoading, setIsTestLoading] = useState(false)
  const [cookieDebug, setCookieDebug] = useState<string[]>([])

  // Check cookies on load for debugging
  useEffect(() => {
    try {
      const allCookies = document.cookie
        .split(';')
        .map(cookie => cookie.trim())
        .filter(Boolean)
      
      setCookieDebug(allCookies.map(c => {
        const [name] = c.split('=')
        return name || ''
      }))
    } catch (err) {
      console.error('Error reading cookies:', err)
    }
  }, [])

  // Function to run the CSRF test
  const runCsrfTest = async () => {
    try {
      setIsTestLoading(true)
      setTestResults(null)
      
      // Make a GET request to test endpoint
      const getResponse = await fetch('/api/csrf/test', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })
      
      const getResults = await getResponse.json()
      
      // Make a POST request to test CSRF validation
      const postResponse = await fetch('/api/csrf/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders
        },
        body: JSON.stringify({ testData: 'CSRF Test' }),
        credentials: 'include',
      })
      
      const postResults = await postResponse.json()
      
      // Combine results
      setTestResults({
        getResults,
        postResults,
        csrfHeaders,
        status: {
          getStatus: getResponse.status,
          postStatus: postResponse.status,
        }
      })
    } catch (err) {
      console.error('CSRF test error:', err)
      setTestResults({
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setIsTestLoading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 my-8">
      <h2 className="text-xl font-bold mb-4">CSRF Test Utilities</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-3">Client-Side State</h3>
          <div className="bg-gray-50 p-4 rounded border">
            <p><span className="font-semibold">CSRF Token:</span> {csrfToken ? `${csrfToken.substring(0, 8)}...` : 'Not loaded'}</p>
            <p><span className="font-semibold">Token Length:</span> {csrfToken?.length || 0}</p>
            <p><span className="font-semibold">Loading:</span> {isLoading ? 'Yes' : 'No'}</p>
            <p><span className="font-semibold">Error:</span> {error ? error.message : 'None'}</p>
            <p><span className="font-semibold">Headers Set:</span> {Object.keys(csrfHeaders).join(', ')}</p>
            
            <div className="mt-3">
              <p className="font-semibold">Visible Cookies:</p>
              <ul className="text-xs text-gray-600 pl-4">
                {cookieDebug.length > 0 ? (
                  cookieDebug.map((cookie, i) => (
                    <li key={i}>{cookie}</li>
                  ))
                ) : (
                  <li>No cookies found</li>
                )}
              </ul>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">Test Actions</h3>
          <button
            onClick={runCsrfTest}
            disabled={isTestLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isTestLoading ? 'Testing...' : 'Run CSRF Test'}
          </button>
          
          <div className="mt-4">
            <button
              onClick={() => {
                // Force refresh token
                window.sessionStorage.removeItem('csrfToken')
                window.location.reload()
              }}
              className="text-red-500 hover:text-red-600 text-sm underline"
            >
              Reset Token & Reload
            </button>
          </div>
        </div>
      </div>
      
      {testResults && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3">Test Results</h3>
          <div className="bg-gray-50 p-4 rounded border overflow-auto max-h-96">
            <pre className="text-xs">{JSON.stringify(testResults, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
} 