'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export default function TestAppleAuth() {
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (data?.session?.user) {
        setUser(data.session.user)
      }
    }
    
    checkSession()
    
    // Set up auth state change listener
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        setError(null)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })
    
    return () => {
      data?.subscription?.unsubscribe()
    }
  }, [supabase.auth])

  const handleAppleSignIn = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-6">Apple OAuth Test</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}
      
      {user ? (
        <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">You are signed in!</h2>
          <div className="mb-4">
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Provider:</strong> {user.app_metadata?.provider || 'Unknown'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button
          onClick={handleAppleSignIn}
          disabled={loading}
          className="flex items-center justify-center bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded w-full max-w-md"
        >
          {loading ? 'Loading...' : 'Sign in with Apple'}
        </button>
      )}
    </div>
  )
} 