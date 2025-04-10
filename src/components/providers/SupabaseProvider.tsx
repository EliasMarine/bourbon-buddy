'use client'

import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js'

// Create context for Supabase client
const SupabaseContext = createContext<ReturnType<typeof createBrowserClient> | undefined>(undefined)

// Create context for session state
const SessionContext = createContext<{
  session: Session | null
  user: User | null
  isLoading: boolean
  status: 'loading' | 'authenticated' | 'unauthenticated'
}>({
  session: null,
  user: null,
  isLoading: true,
  status: 'loading'
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
  const [supabase] = useState(() => createBrowserClient())
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Function to handle auth state changes
  const handleAuthChange = useCallback((event: AuthChangeEvent, session: Session | null) => {
    setSession(session)
    setUser(session?.user ?? null)
    
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      console.log('👤 User signed in:', session?.user?.email)
      router.refresh()
    }
    
    if (event === 'SIGNED_OUT') {
      console.log('👋 User signed out')
      router.refresh()
    }
    
    setIsLoading(false)
  }, [router])
  
  // Fetch session on mount and set up auth listener
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      setIsLoading(true)
      
      try {
        // Get the initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error fetching session:', error.message)
          return
        }
        
        if (session) {
          setSession(session)
          setUser(session.user)
          console.log('✅ Session restored for:', session.user.email)
        }
      } catch (error) {
        console.error('Unexpected error getting session:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Initialize session
    initializeAuth()
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange)
    
    // Clean up subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, handleAuthChange])
  
  // Auth-related helper functions
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error.message)
      return false
    }
    return true
  }, [supabase])
  
  return (
    <SupabaseContext.Provider value={supabase}>
      <SessionContext.Provider value={{
        session,
        user,
        isLoading,
        status: isLoading ? 'loading' : session ? 'authenticated' : 'unauthenticated'
      }}>
        {children}
      </SessionContext.Provider>
    </SupabaseContext.Provider>
  )
} 