'use client'

import { useEffect, useState } from 'react'
import { getStorageAuthData, testCorsConfiguration } from '@/lib/auth-diagnostics'
import Button from "@/components/ui/button"
import { getSupabaseClient } from '@/lib/supabase-singleton'
import { Separator } from '@/components/ui/Separator'

// Simple Card components for the debug page
function Card({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`bg-gray-800/50 rounded-lg border border-gray-700 shadow-lg ${className}`}>{children}</div>
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-4 border-b border-gray-700">{children}</div>
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-bold text-white">{children}</h3>
}

function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-400 mt-1">{children}</p>
}

function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>
}

function AuthDebugPage() {
  const [storageData, setStorageData] = useState<any>(null)
  const [corsTestResult, setCorsTestResult] = useState<any>(null)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [refreshTokenTest, setRefreshTokenTest] = useState<any>(null)
  const [csrfTokenTest, setCsrfTokenTest] = useState<any>(null)
  const [loading, setLoading] = useState({
    storage: false,
    cors: false,
    session: false,
    refresh: false,
    csrf: false
  })
  const [error, setError] = useState<string | null>(null)

  // Initialize Supabase client for checking session
  const supabase = getSupabaseClient()

  async function fetchSessionInfo() {
    setLoading(prev => ({ ...prev, session: true }))
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      
      setSessionInfo({
        hasSession: !!data.session,
        expiresAt: data.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : null,
        hasUser: !!data.session?.user,
        userId: data.session?.user?.id,
        userEmail: data.session?.user?.email,
        authProvider: data.session?.user?.app_metadata?.provider,
        refreshToken: data.session?.refresh_token ? 'Present (hidden)' : 'Missing'
      })
    } catch (err) {
      console.error('Session check error:', err)
      setError('Failed to fetch session: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(prev => ({ ...prev, session: false }))
    }
  }

  function checkLocalStorage() {
    setLoading(prev => ({ ...prev, storage: true }))
    try {
      const data = getStorageAuthData()
      setStorageData(data)
    } catch (err) {
      console.error('Storage check error:', err)
      setError('Failed to check storage: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(prev => ({ ...prev, storage: false }))
    }
  }

  async function runCorsTest() {
    setLoading(prev => ({ ...prev, cors: true }))
    try {
      const result = await testCorsConfiguration()
      setCorsTestResult(result)
    } catch (err) {
      console.error('CORS test error:', err)
      setError('Failed to run CORS test: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(prev => ({ ...prev, cors: false }))
    }
  }

  async function testRefreshToken() {
    setLoading(prev => ({ ...prev, refresh: true }))
    setRefreshTokenTest(null)
    try {
      // First get the session to get the refresh token
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) throw sessionError
      if (!sessionData.session?.refresh_token) throw new Error('No refresh token available')
      
      // Test using our custom endpoint
      const response = await fetch('/api/auth/supabase-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: sessionData.session.refresh_token
        }),
        credentials: 'include'
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${result.error || 'Unknown error'}`)
      }
      
      setRefreshTokenTest({
        success: true,
        message: 'Successfully refreshed token via proxy',
        accessTokenPreview: result.access_token ? `${result.access_token.substring(0, 10)}...` : 'Missing',
        refreshTokenPreview: result.refresh_token ? `${result.refresh_token.substring(0, 10)}...` : 'Missing',
        hasUser: !!result.user,
        timestamp: new Date().toISOString()
      })
      
      // Fetch session info again to verify we updated the session
      setTimeout(() => {
        fetchSessionInfo()
      }, 1000)
      
    } catch (err) {
      console.error('Refresh token test error:', err)
      setRefreshTokenTest({
        success: false,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString()
      })
      setError('Failed to test refresh token: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(prev => ({ ...prev, refresh: false }))
    }
  }

  async function testCsrfToken() {
    setLoading(prev => ({ ...prev, csrf: true }))
    setCsrfTokenTest(null)
    
    try {
      // Clear any existing CSRF token in sessionStorage
      sessionStorage.removeItem('csrfToken')
      
      // Fetch a new CSRF token
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Debug cookie presence
      const cookies = document.cookie
        .split(';')
        .map(cookie => cookie.trim())
        .filter(cookie => cookie.startsWith('csrf-') || cookie.startsWith('xsrf-'))
      
      setCsrfTokenTest({
        success: true,
        token: data.csrfToken ? `${data.csrfToken.substring(0, 10)}...` : 'Missing',
        cookieName: data.cookieName,
        cookiesPresent: cookies.length > 0 ? 'Yes' : 'No',
        cookieCount: cookies.length,
        cookiesInfo: cookies.map(c => {
          const [name] = c.split('=')
          return { name, exists: true }
        }),
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      console.error('CSRF token test error:', err)
      setCsrfTokenTest({
        success: false,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(prev => ({ ...prev, csrf: false }))
    }
  }

  useEffect(() => {
    // Run initial checks on page load
    checkLocalStorage()
    fetchSessionInfo()
  }, [])

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Debugging</h1>
      
      <Card className="mb-6 border-amber-500/50">
        <CardHeader>
          <CardTitle>Authentication CORS Solution Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>The authentication CORS error occurs because Supabase is returning a wildcard origin (<code>*</code>) in its CORS headers, 
            but the browser is sending credentials which is incompatible with wildcard origins.</p>
            
            <h3 className="text-lg font-semibold">Solution Options:</h3>
            
            <div className="space-y-2">
              <div className="p-3 bg-gray-900 rounded-md">
                <h4 className="font-medium text-amber-500">Option 1: Use our API proxy (Recommended)</h4>
                <p className="mt-1 text-sm">All authentication requests are routed through our Next.js API routes which handle CORS properly.</p>
                <p className="mt-1 text-sm">✅ This is already implemented in the code. Test it with the "Test Refresh Token" button.</p>
              </div>
              
              <div className="p-3 bg-gray-900 rounded-md">
                <h4 className="font-medium text-amber-500">Option 2: Configure Supabase Project</h4>
                <p className="mt-1 text-sm">Update Supabase project settings to add specific allowed origins instead of using wildcard:</p>
                <ol className="list-decimal ml-5 mt-1 text-sm space-y-1">
                  <li>Go to Supabase Dashboard → Authentication → URL Configuration</li>
                  <li>Add all your domains (production and development) to Site URL and Redirect URLs</li>
                  <li>Make sure CORS settings include specific allowed origins instead of "*"</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="grid gap-6">
        {/* Session Information */}
        <Card>
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
            <CardDescription>Current authentication session status</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={fetchSessionInfo} 
              disabled={loading.session}
              size="sm"
              className="mb-4"
            >
              {loading.session ? 'Checking...' : 'Refresh Session Info'}
            </Button>
            
            {sessionInfo ? (
              <div className="space-y-2">
                <div className="p-3 rounded bg-slate-50">
                  <div className="font-medium mb-1">Status: {sessionInfo.hasSession ? '✅ Active' : '❌ No active session'}</div>
                  
                  {sessionInfo.hasSession && (
                    <>
                      <div>User ID: {sessionInfo.userId || 'N/A'}</div>
                      <div>Email: {sessionInfo.userEmail || 'N/A'}</div>
                      <div>Provider: {sessionInfo.authProvider || 'N/A'}</div>
                      <div>Expires: {sessionInfo.expiresAt || 'N/A'}</div>
                      <div>Refresh Token: {sessionInfo.refreshToken}</div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-slate-500">No session data available</div>
            )}
          </CardContent>
        </Card>
        
        {/* Refresh Token Test */}
        <Card>
          <CardHeader>
            <CardTitle>Refresh Token Test</CardTitle>
            <CardDescription>Test token refresh via API proxy</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testRefreshToken} 
              disabled={loading.refresh || !sessionInfo?.hasSession}
              size="sm"
              className="mb-4"
            >
              {loading.refresh ? 'Testing...' : 'Test Refresh Token'}
            </Button>
            
            {!sessionInfo?.hasSession && (
              <div className="text-amber-500 mb-4">
                You must be logged in to test token refresh
              </div>
            )}
            
            {refreshTokenTest && (
              <div className="space-y-2">
                <div className={`p-3 rounded ${refreshTokenTest.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="font-medium mb-1">
                    Result: {refreshTokenTest.success ? '✅ Success' : '❌ Failed'}
                  </div>
                  {refreshTokenTest.success ? (
                    <>
                      <div>Message: {refreshTokenTest.message}</div>
                      <div>Access Token: {refreshTokenTest.accessTokenPreview}</div>
                      <div>Refresh Token: {refreshTokenTest.refreshTokenPreview}</div>
                      <div>User Data: {refreshTokenTest.hasUser ? 'Present' : 'Missing'}</div>
                    </>
                  ) : (
                    <div>Error: {refreshTokenTest.error}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    Timestamp: {refreshTokenTest.timestamp}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* CSRF Token Test */}
        <Card>
          <CardHeader>
            <CardTitle>CSRF Token Test</CardTitle>
            <CardDescription>Test CSRF token retrieval with proper CORS headers</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testCsrfToken} 
              disabled={loading.csrf}
              size="sm"
              className="mb-4"
            >
              {loading.csrf ? 'Testing...' : 'Test CSRF Token'}
            </Button>
            
            {csrfTokenTest && (
              <div className="space-y-2">
                <div className={`p-3 rounded ${csrfTokenTest.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="font-medium mb-1">
                    Result: {csrfTokenTest.success ? '✅ Success' : '❌ Failed'}
                  </div>
                  {csrfTokenTest.success ? (
                    <>
                      <div>Token: {csrfTokenTest.token}</div>
                      <div>Cookie Name: {csrfTokenTest.cookieName || 'N/A'}</div>
                      <div>Cookies Present: {csrfTokenTest.cookiesPresent}</div>
                      <div>Cookie Count: {csrfTokenTest.cookieCount}</div>
                    </>
                  ) : (
                    <div>Error: {csrfTokenTest.error}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    Timestamp: {csrfTokenTest.timestamp}
                  </div>
                </div>
                
                {csrfTokenTest.cookiesInfo && csrfTokenTest.cookiesInfo.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h3 className="font-medium mb-2">CSRF Cookies</h3>
                      <pre className="text-xs p-3 bg-slate-100 rounded overflow-auto max-h-48">
                        {JSON.stringify(csrfTokenTest.cookiesInfo, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Local Storage Information */}
        <Card>
          <CardHeader>
            <CardTitle>Local Storage</CardTitle>
            <CardDescription>Authentication-related storage items</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={checkLocalStorage} 
              disabled={loading.storage}
              size="sm"
              className="mb-4"
            >
              {loading.storage ? 'Checking...' : 'Refresh Storage Info'}
            </Button>
            
            {storageData ? (
              <div className="space-y-2">
                <div className="p-3 rounded bg-slate-50">
                  <div className="font-medium mb-1">
                    Summary: {storageData.hasAuthKeys ? '✅ Auth keys found' : '❌ No auth keys found'}
                  </div>
                  <div>Auth Keys Present: {storageData.hasAuthKeys ? 'Yes' : 'No'}</div>
                  <div>Access Token: {storageData.hasAccessToken ? 'Yes' : 'No'}</div>
                  <div>Refresh Token: {storageData.hasRefreshToken ? 'Yes' : 'No'}</div>
                  <div>Total Keys: {storageData.keyCount}</div>
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <h3 className="font-medium mb-2">Storage Keys</h3>
                  <pre className="text-xs p-3 bg-slate-100 rounded overflow-auto max-h-48">
                    {JSON.stringify(storageData.storageData, null, 2)}
                  </pre>
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <h3 className="font-medium mb-2">Browser Info</h3>
                  <pre className="text-xs p-3 bg-slate-100 rounded overflow-auto max-h-48">
                    {JSON.stringify(storageData.browserInfo, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-slate-500">No storage data available</div>
            )}
          </CardContent>
        </Card>
        
        {/* CORS Test */}
        <Card>
          <CardHeader>
            <CardTitle>CORS Test</CardTitle>
            <CardDescription>Test API connectivity and CORS configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runCorsTest} 
              disabled={loading.cors}
              size="sm"
              className="mb-4"
            >
              {loading.cors ? 'Testing...' : 'Run CORS Test'}
            </Button>
            
            {corsTestResult && (
              <div className="space-y-2">
                <div className={`p-3 rounded ${corsTestResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="font-medium mb-1">
                    Result: {corsTestResult.success ? '✅ Success' : '❌ Failed'}
                  </div>
                  {!corsTestResult.success && <div>Error: {corsTestResult.error}</div>}
                  {corsTestResult.status && <div>Status: {corsTestResult.status}</div>}
                </div>
                
                {corsTestResult.data && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h3 className="font-medium mb-2">Response Data</h3>
                      <pre className="text-xs p-3 bg-slate-100 rounded overflow-auto max-h-64">
                        {JSON.stringify(corsTestResult.data, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AuthDebugPage 