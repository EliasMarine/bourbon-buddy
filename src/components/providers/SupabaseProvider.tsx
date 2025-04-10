'use client'

import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js'

// Generate a debug ID to trace this component instance
const providerDebugId = Math.random().toString(36).substring(2, 8);

// Create context for Supabase client
const SupabaseContext = createContext<ReturnType<typeof createBrowserClient> | undefined>(undefined)

// Create context for session state
const SessionContext = createContext<{
  session: Session | null
  user: User | null
  isLoading: boolean
  status: 'loading' | 'authenticated' | 'unauthenticated'
  error: string | null
}>({
  session: null,
  user: null,
  isLoading: true,
  status: 'loading',
  error: null
})

/**
 * Hook to access Supabase client
 */
export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

/**
 * Hook to access current session state
 */
export const useSessionContext = () => {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SupabaseProvider')
  }
  return context
}

/**
 * Provider for Supabase client and session state
 */
export default function SupabaseProvider({ 
  children 
}: { 
  children: React.ReactNode
}) {
  console.log(`[${providerDebugId}] 🔄 SupabaseProvider initializing`);
  
  const [supabase] = useState(() => {
    console.log(`[${providerDebugId}] 🔨 Creating Supabase browser client`);
    try {
      return createBrowserClient();
    } catch (err) {
      console.error(`[${providerDebugId}] ❌ Failed to create Supabase client:`, err);
      throw err; // Re-throw to prevent rendering with a broken client
    }
  });
  
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Function to handle auth state changes
  const handleAuthChange = useCallback((event: AuthChangeEvent, session: Session | null) => {
    console.log(`[${providerDebugId}] 🔄 Auth state changed: ${event}`);
    
    setSession(session)
    setUser(session?.user ?? null)
    
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      console.log(`[${providerDebugId}] 👤 User signed in:`, session?.user?.email)
      router.refresh()
    }
    
    if (event === 'SIGNED_OUT') {
      console.log(`[${providerDebugId}] 👋 User signed out`)
      router.refresh()
    }
    
    setIsLoading(false)
  }, [router])
  
  // Fetch session on mount and set up auth listener
  useEffect(() => {
    console.log(`[${providerDebugId}] 🔄 Setting up auth state listener`);
    
    // Get initial session
    const initializeAuth = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        console.log(`[${providerDebugId}] 🔍 Fetching initial session`);
        
        // Get the initial session
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error(`[${providerDebugId}] ❌ Error fetching session:`, error.message)
          setError(`Session fetch failed: ${error.message}`)
          return
        }
        
        const sessionData = data?.session;
        
        if (sessionData && sessionData.user) {
          console.log(`[${providerDebugId}] ✅ Session restored for:`, sessionData.user.email)
          setSession(sessionData)
          setUser(sessionData.user)
        } else {
          console.log(`[${providerDebugId}] ℹ️ No active session found`)
          setSession(null)
          setUser(null)
        }
      } catch (error) {
        console.error(`[${providerDebugId}] ❌ Unexpected error getting session:`, error)
        setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Initialize session
    initializeAuth()
    
    // Set up auth state change listener
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      const { data } = supabase.auth.onAuthStateChange(handleAuthChange)
      subscription = data.subscription
      console.log(`[${providerDebugId}] ✅ Auth state change listener initialized`)
    } catch (error) {
      console.error(`[${providerDebugId}] ❌ Failed to set up auth listener:`, error)
      setError(`Auth listener error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    
    // Clean up subscription
    return () => {
      console.log(`[${providerDebugId}] 🧹 Cleaning up auth listener`)
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [supabase, handleAuthChange])
  
  // Auth-related helper functions
  const signOut = useCallback(async () => {
    try {
      console.log(`[${providerDebugId}] 🔄 Signing out user`)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error(`[${providerDebugId}] ❌ Error signing out:`, error.message)
        return false
      }
      console.log(`[${providerDebugId}] ✅ User signed out successfully`)
      return true
    } catch (error) {
      console.error(`[${providerDebugId}] ❌ Unexpected error during sign out:`, error)
      return false
    }
  }, [supabase])
  
  console.log(`[${providerDebugId}] 🔄 SupabaseProvider rendering with auth status:`, 
    isLoading ? 'loading' : session ? 'authenticated' : 'unauthenticated');
  
  return (
    <SupabaseContext.Provider value={supabase}>
      <SessionContext.Provider value={{
        session,
        user,
        isLoading,
        status: isLoading ? 'loading' : session ? 'authenticated' : 'unauthenticated',
        error
      }}>
        {children}
      </SessionContext.Provider>
    </SupabaseContext.Provider>
  )
} 