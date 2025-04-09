'use client'

import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { useSession, SessionProvider, signOut, signIn } from 'next-auth/react'

const SupabaseContext = createContext<ReturnType<typeof createBrowserClient> | undefined>(undefined)

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

function SupabaseProviderInner({ 
  children 
}: { 
  children: React.ReactNode
}) {
  const [supabase] = useState(() => createBrowserClient())
  const router = useRouter()
  const session = useSession()
  const nextAuthSession = session?.data
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [syncAttempts, setSyncAttempts] = useState(0)
  
  // Cleanup and reset all auth state
  const cleanupAuthState = useCallback(async () => {
    console.log('🧹 Cleaning up auth state')
    // Clear client-side storage
    try {
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.removeItem('supabase.auth.token')
      
      // Sign out from Supabase explicitly
      await supabase.auth.signOut()
      
      // Clear all cookies via API
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      console.log('✅ Auth state cleared successfully')
    } catch (error) {
      console.error('Error cleaning up auth state:', error)
    }
  }, [supabase])

  // Handle Supabase auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Supabase auth event:', event, session?.user?.email || 'no session')
        
        if (event === 'SIGNED_OUT') {
          console.log('🚪 Supabase SIGNED_OUT event, cleaning up session')
          await cleanupAuthState()
        }
      }
    )
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, cleanupAuthState])

  // Sync NextAuth session with Supabase
  useEffect(() => {
    const syncAuthState = async () => {
      // Skip if already syncing
      if (isSyncing) return
      
      // If we've just synced in the last 5 seconds, skip
      if (lastSyncTime && Date.now() - lastSyncTime < 5000) {
        console.log('🔄 Skipping auth sync, last sync was too recent')
        return
      }
      
      setIsSyncing(true)
      
      try {
        console.log('🔍 Checking Supabase session status', { 
          hasNextAuthSession: !!nextAuthSession, 
          hasNextAuthAccessToken: !!nextAuthSession?.accessToken,
          attemptCount: syncAttempts + 1
        })
        
        // Force session refresh to ensure we have the latest state
        console.log('🔄 Refreshing Supabase session state')
        const { error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError && refreshError.message !== 'No current session') {
          console.error('❌ Error refreshing Supabase session:', refreshError)
        }
        
        // Check if already signed in to Supabase
        const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Error getting Supabase session:', sessionError)
          await cleanupAuthState()
          setIsSyncing(false)
          return
        }
        
        // Case 1: Both sessions exist
        if (nextAuthSession?.user?.email && supabaseSession?.user?.email) {
          // If the emails match, both auth systems are in sync
          if (nextAuthSession.user.email.toLowerCase() === supabaseSession.user.email.toLowerCase()) {
            console.log('✅ Both NextAuth and Supabase sessions are present and match')
            setLastSyncTime(Date.now())
            setSyncAttempts(0)
            setIsSyncing(false)
            return
          } else {
            // Sessions exist but emails don't match - this is a problematic state
            console.warn('⚠️ Session mismatch - NextAuth and Supabase have different users')
            await cleanupAuthState()
            router.refresh()
            setIsSyncing(false)
            return
          }
        }
        
        // Case 2: NextAuth session but no Supabase session
        if (nextAuthSession?.user?.email && !supabaseSession) {
          console.log(`🔄 Syncing NextAuth session to Supabase, email: ${nextAuthSession.user.email}`)
          
          // Try to sign in using server-side API for better token handling
          try {
            console.log('🔄 Falling back to server API for session creation')
            
            const response = await fetch('/api/auth/supabase-session', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include' // Important to include cookies
            })
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
              console.error('❌ Failed to get Supabase session from API:', errorData)
              
              // Increment attempts for retry logic
              setSyncAttempts(prev => prev + 1)
              
              // If we've tried 3 times and failed, this is problematic
              if (syncAttempts >= 2) {
                console.warn('⚠️ Multiple session sync failures, cleaning up state')
                await cleanupAuthState()
                router.refresh()
              } else {
                // Schedule a retry with exponential backoff
                const retryDelay = Math.min(2000 * Math.pow(2, syncAttempts), 10000) // Max 10s delay
                console.log(`🔄 Scheduling retry in ${retryDelay}ms (attempt ${syncAttempts + 1})`)
                setTimeout(() => {
                  setIsSyncing(false)
                  syncAuthState()
                }, retryDelay)
              }
              
              setIsSyncing(false)
              return
            }
            
            const data = await response.json()
            
            if (!data.properties?.access_token) {
              console.error('❌ API response missing token data:', data)
              setIsSyncing(false)
              return
            }
            
            console.log('✅ Got Supabase session from API, setting in client')
            
            // Set the session in Supabase
            const { error } = await supabase.auth.setSession({
              access_token: data.properties.access_token,
              refresh_token: data.properties.refresh_token
            })
            
            if (error) {
              console.error('❌ Failed to set Supabase session from API:', error)
              setIsSyncing(false)
              return
            }
            
            console.log('✅ Successfully synced NextAuth session to Supabase via API')
            setLastSyncTime(Date.now())
            setSyncAttempts(0)
            
            // Force a page refresh to update UI state
            router.refresh()
          } catch (error) {
            console.error('❌ Error in server API session creation:', error)
            setIsSyncing(false)
            return
          }
        }
        
        // Case 3: Supabase session but no NextAuth session
        if (supabaseSession?.user?.email && !nextAuthSession) {
          console.log(`🔄 Syncing Supabase session to NextAuth, email: ${supabaseSession.user.email}`)
          
          try {
            // Sign in to NextAuth using the Supabase session
            const result = await signIn('credentials', {
              redirect: false,
              email: supabaseSession.user.email,
              supabaseSession: 'true'
            })
            
            if (result?.error) {
              console.error('❌ Error signing in with NextAuth:', result.error)
              
              // Increment attempts for retry logic
              setSyncAttempts(prev => prev + 1)
              
              // If we've tried 3 times and failed, clean up state
              if (syncAttempts >= 2) {
                console.warn('⚠️ Multiple NextAuth sign-in failures, cleaning up state')
                await cleanupAuthState()
                router.refresh()
              } else {
                // Schedule a retry with exponential backoff
                const retryDelay = Math.min(2000 * Math.pow(2, syncAttempts), 10000) // Max 10s delay
                console.log(`🔄 Scheduling retry in ${retryDelay}ms (attempt ${syncAttempts + 1})`)
                setTimeout(() => {
                  setIsSyncing(false)
                  syncAuthState()
                }, retryDelay)
              }
            } else {
              console.log('✅ Successfully synced Supabase session with NextAuth')
              setLastSyncTime(Date.now())
              setSyncAttempts(0)
              router.refresh()
            }
          } catch (error) {
            console.error('❌ Error signing in with NextAuth:', error)
          }
        }
      } catch (error) {
        console.error('❌ Unexpected error in auth sync:', error)
      } finally {
        setIsSyncing(false)
      }
    }
    
    // Call sync immediately when this effect runs
    syncAuthState()
    
    // Also set up a short interval to check if sync is needed
    // This helps with race conditions and other timing issues
    const intervalId = setInterval(() => {
      if (!isSyncing && !lastSyncTime) {
        syncAuthState()
      }
    }, 2000)
    
    return () => clearInterval(intervalId)
  }, [nextAuthSession, supabase, router, isSyncing, cleanupAuthState, lastSyncTime, syncAttempts])

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  )
}

// Wrap the inner component with SessionProvider to ensure useSession is available
export default function SupabaseProvider({ 
  children 
}: { 
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <SupabaseProviderInner>
        {children}
      </SupabaseProviderInner>
    </SessionProvider>
  )
} 