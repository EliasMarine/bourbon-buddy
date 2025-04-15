'use client'

import { useEffect, useState } from 'react'

export default function ClientDebugTestPage() {
  const [diagnosticInfo, setDiagnosticInfo] = useState({
    mounted: false,
    loadTime: null as string | null,
    windowDimensions: { width: 0, height: 0 },
    env: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  })
  
  useEffect(() => {
    // Record mount time
    const mountTime = new Date().toISOString()
    
    // Get window dimensions
    const windowDimensions = {
      width: window.innerWidth,
      height: window.innerHeight
    }
    
    setDiagnosticInfo({
      mounted: true,
      loadTime: mountTime,
      windowDimensions,
      env: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    })
    
    console.log('🔧 Client test page mounted', mountTime)
  }, [])
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Client-Side Debug Test</h1>
      <p className="mb-4">
        If you can see this content, client-side components are rendering correctly.
      </p>
      
      <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-600/30 mb-6">
        <h2 className="text-xl font-semibold mb-2">Client Component Status</h2>
        <p>
          <span className="font-medium">Component Mounted:</span>{' '}
          {diagnosticInfo.mounted ? 
            <span className="text-green-400">Yes</span> : 
            <span className="text-red-400">No</span>}
        </p>
        {diagnosticInfo.loadTime && (
          <p>
            <span className="font-medium">Mount Time:</span>{' '}
            {diagnosticInfo.loadTime}
          </p>
        )}
      </div>
      
      <div className="p-4 bg-gray-800 rounded-lg mb-6">
        <h3 className="font-medium mb-2">Environment</h3>
        <pre className="overflow-auto text-sm p-2 bg-gray-900 rounded">
          {JSON.stringify(diagnosticInfo.env, null, 2)}
        </pre>
      </div>
      
      <div className="p-4 bg-gray-800 rounded-lg mb-6">
        <h3 className="font-medium mb-2">Window Size</h3>
        <p>Width: {diagnosticInfo.windowDimensions.width}px</p>
        <p>Height: {diagnosticInfo.windowDimensions.height}px</p>
      </div>
      
      <div className="flex gap-4">
        <a 
          href="/debug-test"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Server Component Test
        </a>
        <a 
          href="/"
          className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
        >
          Go to Homepage
        </a>
      </div>
    </div>
  )
} 