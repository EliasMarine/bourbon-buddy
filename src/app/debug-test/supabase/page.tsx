'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase-singleton'

export default function SupabaseDebugPage() {
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [message, setMessage] = useState('Initializing...')
  const [details, setDetails] = useState<Record<string, any>>({})
  
  useEffect(() => {
    async function checkSupabase() {
      try {
        console.log('🔍 Testing Supabase connection')
        setMessage('Creating Supabase client...')
        
        // Try to initialize the Supabase client
        const supabase = getSupabaseClient()
        if (!supabase) {
          throw new Error('Failed to initialize Supabase client')
        }
        
        setMessage('Checking public variables...')
        
        // Check if required environment variables are set
        const envCheck = {
          supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
        
        if (!envCheck.supabaseUrl || !envCheck.supabaseAnonKey) {
          throw new Error('Missing required Supabase environment variables')
        }
        
        setMessage('Testing health endpoint...')
        
        // Try to fetch the health check endpoint
        const { data: healthData, error: healthError } = await supabase.from('health_check').select('*').limit(1)
        
        if (healthError) {
          // If the health_check table doesn't exist, that's fine - try another test
          if (healthError.code === '42P01') { // Table doesn't exist
            setMessage('Health check table not found, testing auth...')
          } else {
            console.warn('Health check error:', healthError)
            setMessage(`Health check error: ${healthError.message}`)
          }
        } else {
          setMessage('Health check successful')
          setDetails(prev => ({ ...prev, healthData }))
        }
        
        // Try to get the current session
        setMessage('Checking authentication...')
        const { data: authData, error: authError } = await supabase.auth.getSession()
        
        if (authError) {
          throw new Error(`Auth error: ${authError.message}`)
        }
        
        setMessage('Supabase connection successful')
        setDetails(prev => ({ 
          ...prev, 
          authStatus: authData.session ? 'authenticated' : 'unauthenticated',
          sessionExpires: authData.session?.expires_at
            ? new Date(authData.session.expires_at * 1000).toISOString()
            : null
        }))
        
        setStatus('success')
        
      } catch (error) {
        console.error('Supabase debug error:', error)
        setStatus('error')
        setMessage(error instanceof Error ? error.message : String(error))
      }
    }
    
    checkSupabase()
  }, [])
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Supabase Debug Test</h1>
      <p className="mb-6">
        This page tests your Supabase connection and authentication.
      </p>
      
      <div className={`p-4 rounded-lg border mb-6 ${
        status === 'loading' ? 'bg-blue-900/20 border-blue-600/30' :
        status === 'success' ? 'bg-green-900/20 border-green-600/30' :
        'bg-red-900/20 border-red-600/30'
      }`}>
        <h2 className="text-xl font-semibold mb-2">Status: {status}</h2>
        <p className="mb-2">{message}</p>
        
        {status === 'success' && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Details</h3>
            <pre className="bg-gray-900 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="flex gap-4">
        <a 
          href="/debug-test"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Debug Test
        </a>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Retry Test
        </button>
      </div>
    </div>
  )
} 