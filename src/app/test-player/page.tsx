'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function TestPlayerPage() {
  const searchParams = useSearchParams()
  const playbackId = searchParams?.get('playbackId') || ''
  const [urlInput, setUrlInput] = useState<string>(playbackId)
  const [hlsUrl, setHlsUrl] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [testResult, setTestResult] = useState<any>(null)
  
  // Signing related state
  const [useSignedUrl, setUseSignedUrl] = useState<boolean>(false)
  const [keyId, setKeyId] = useState<string>('')
  const [privateKey, setPrivateKey] = useState<string>('')
  const [expirationMinutes, setExpirationMinutes] = useState<number>(60)
  const [signedToken, setSignedToken] = useState<string>('')
  
  // Set up the test player when playback ID changes
  useEffect(() => {
    if (playbackId) {
      setUrlInput(playbackId)
      testStream(playbackId)
    }
  }, [playbackId])
  
  // Function to test the stream
  const testStream = async (id: string) => {
    if (!id) {
      setErrorMessage('Please enter a playback ID')
      return
    }
    
    setLoading(true)
    setErrorMessage('')
    setTestResult(null)
    
    try {
      // If using signed URL, pass the signing params to the backend
      const queryParams = new URLSearchParams({
        playbackId: id
      })
      
      if (useSignedUrl && keyId && privateKey) {
        queryParams.append('useSignedUrl', 'true')
        queryParams.append('keyId', keyId)
        queryParams.append('privateKey', encodeURIComponent(privateKey))
        queryParams.append('expirationMinutes', expirationMinutes.toString())
      }
      
      const response = await fetch(`/api/videos/test-stream?${queryParams.toString()}`)
      const data = await response.json()
      
      if (!response.ok) {
        setErrorMessage(data.message || 'Failed to test stream')
        setTestResult(data)
      } else {
        setHlsUrl(data.hlsUrl)
        setSignedToken(data.token || '')
        setTestResult(data)
      }
    } catch (error: any) {
      setErrorMessage(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  // Handle the form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    testStream(urlInput)
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Mux Video Test Player</h1>
      
      <div className="mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter Mux Playback ID"
              className="px-4 py-2 border border-gray-300 rounded flex-grow"
            />
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              disabled={loading}
            >
              {loading ? 'Testing...' : 'Test Stream'}
            </button>
          </div>
          
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="useSignedUrl"
                checked={useSignedUrl}
                onChange={(e) => setUseSignedUrl(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="useSignedUrl" className="font-medium">Use Signed URL</label>
            </div>
            
            {useSignedUrl && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="keyId" className="block text-sm font-medium mb-1">Signing Key ID</label>
                  <input
                    type="text"
                    id="keyId"
                    value={keyId}
                    onChange={(e) => setKeyId(e.target.value)}
                    placeholder="Enter your Mux signing key ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label htmlFor="privateKey" className="block text-sm font-medium mb-1">Private Key (base64)</label>
                  <textarea
                    id="privateKey"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Paste your base64 encoded private key"
                    className="w-full px-4 py-2 border border-gray-300 rounded h-24 font-mono text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="expirationMinutes" className="block text-sm font-medium mb-1">Expiration (minutes)</label>
                  <input
                    type="number"
                    id="expirationMinutes"
                    value={expirationMinutes}
                    onChange={(e) => setExpirationMinutes(parseInt(e.target.value) || 60)}
                    min="1"
                    max="1440"
                    className="w-full px-4 py-2 border border-gray-300 rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </form>
        
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {errorMessage}
          </div>
        )}
      </div>
      
      {hlsUrl && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Video Player</h2>
          
          <div className="bg-black aspect-video max-w-3xl">
            <video 
              controls 
              src={hlsUrl} 
              className="w-full h-full"
              poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 800 450'%3E%3Crect fill='%23000000' width='800' height='450'/%3E%3Ctext x='400' y='225' font-family='Arial' font-size='18' fill='%23FFFFFF' text-anchor='middle' dominant-baseline='middle'%3EClick to play%3C/text%3E%3C/svg%3E"
              onError={() => setErrorMessage('Error playing video. The stream might be invalid or restricted.')}
            />
          </div>
          
          <div className="mt-4">
            <h3 className="font-semibold mb-2">HLS URL:</h3>
            <div className="p-2 bg-gray-100 rounded font-mono text-sm break-all">
              {hlsUrl}
            </div>
            
            {signedToken && (
              <>
                <h3 className="font-semibold mt-4 mb-2">JWT Token:</h3>
                <div className="p-2 bg-gray-100 rounded font-mono text-sm break-all">
                  {signedToken}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {testResult && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          
          <div className="p-4 bg-gray-100 rounded">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Status:</h3>
                <p className={`${testResult.success ? 'text-green-600' : 'text-red-600'} font-medium`}>
                  {testResult.success ? '✅ Stream is accessible' : '❌ Stream check failed'}
                </p>
                
                <h3 className="font-semibold mt-4 mb-2">HTTP Status:</h3>
                <p>{testResult.status} {testResult.statusText}</p>
                
                <h3 className="font-semibold mt-4 mb-2">Playback ID:</h3>
                <p className="font-mono">{testResult.playbackId}</p>
              </div>
              
              <div>
                {testResult.recommendations && (
                  <>
                    <h3 className="font-semibold mb-2">Recommendations:</h3>
                    <ul className="list-disc list-inside">
                      {testResult.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="mb-1">{rec}</li>
                      ))}
                    </ul>
                  </>
                )}
                
                <h3 className="font-semibold mt-4 mb-2">Debug Info:</h3>
                <pre className="p-2 bg-gray-200 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting Tips</h2>
        
        <div className="space-y-4">
          <div className="bg-amber-50 p-4 rounded border border-amber-200">
            <h3 className="font-semibold text-amber-800 mb-2">About Signed Playback IDs</h3>
            <p className="text-amber-700 mb-2">
              If your video uses a <strong>signed playback policy</strong> in Mux, you need to include a JWT token in the URL.
            </p>
            <p className="text-amber-700">
              Check your Mux dashboard to see if this video requires a signed URL or switch to a public playback policy.
            </p>
          </div>
          
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li>Make sure the Mux playback ID is valid and correctly formatted.</li>
            <li>Check that the video asset exists in your Mux dashboard.</li>
            <li>Verify the playback policy is set to "public" in Mux, or use signed URLs if required.</li>
            <li>Try opening the HLS URL directly in VLC Media Player or another HLS-compatible player.</li>
            <li>Check if your browser supports HLS playback natively or if you need an HLS.js polyfill.</li>
            <li>Clear your browser cache and cookies if you've previously encountered errors.</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 