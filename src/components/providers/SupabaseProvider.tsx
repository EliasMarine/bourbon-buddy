'use client'

import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { useSession, SessionProvider, signOut } from 'next-auth/react'

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
        credentials: 'include'
      })
      
      console.log('✅ Auth state cleared successfully')
    } catch (error) {
      console.error('Error cleaning up auth state:', error)
    }
  }, [supabase])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase auth event:', event, session?.user?.email || 'no session')
      
      if (event === 'SIGNED_IN') {
        // If we have a session, verify it immediately to ensure it's valid
        if (session) {
          try {
            const { data, error } = await supabase.auth.getUser()
            if (error || !data.user) {
              console.error('❌ Invalid Supabase session detected during SIGNED_IN event:', error)
              await cleanupAuthState()
              return
            }
            console.log('✅ Supabase user verified on SIGNED_IN:', data.user.email)
          } catch (verifyError) {
            console.error('❌ Error verifying user after SIGNED_IN:', verifyError)
          }
        }
        
        // Refresh the page to update the UI with new auth state
        router.refresh()
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 Supabase SIGNED_OUT event, cleaning up session')
        await cleanupAuthState()
        router.push('/login')
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Supabase token refreshed')
        // Silently refresh the page to ensure fresh data
        router.refresh()
      } else if (event === 'USER_UPDATED') {
        console.log('👤 Supabase user updated')
        router.refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase, cleanupAuthState])

  // Sync NextAuth session with Supabase
  useEffect(() => {
    const syncAuthState = async () => {
      // Skip if already syncing or no NextAuth session
      if (isSyncing || !nextAuthSession?.user?.email) return
      
      setIsSyncing(true)
      
      try {
        console.log('🔍 Checking Supabase session status', { 
          hasNextAuthSession: !!nextAuthSession, 
          hasNextAuthAccessToken: !!nextAuthSession?.accessToken 
        })
        
        // Force session refresh to ensure we have the latest state
        console.log('🔄 Refreshing Supabase session state')
        await supabase.auth.refreshSession()
        
        // Check if already signed in to Supabase
        const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Error getting Supabase session:', sessionError)
          await cleanupAuthState()
          setIsSyncing(false)
          return
        }
        
        // If already signed in to Supabase with matching email, we're good
        if (supabaseSession?.user?.email === nextAuthSession.user.email) {
          console.log('✅ Supabase session already exists and matches NextAuth email')
          
          // Check if token is close to expiration
          const now = Math.floor(Date.now() / 1000)
          const expiresAt = supabaseSession.expires_at
          const timeRemaining = expiresAt - now
          
          if (timeRemaining < 600) { // Less than 10 minutes remaining
            console.log('⚠️ Supabase token expiring soon, refreshing proactively')
            await fallbackSessionCreation()
          } else {
            console.log(`✅ Supabase token valid for ${Math.floor(timeRemaining / 60)} more minutes`)
            setIsSyncing(false)
            return
          }
        } else {
          console.log(`🔄 Syncing NextAuth session to Supabase, email: ${nextAuthSession.user.email}`)
          
          // If we have the access token directly from NextAuth, use it
          if (nextAuthSession.accessToken && nextAuthSession.refreshToken) {
            console.log('🔑 Using NextAuth access token to set Supabase session')
            
            try {
              const { error } = await supabase.auth.setSession({
                access_token: nextAuthSession.accessToken,
                refresh_token: nextAuthSession.refreshToken
              })
              
              if (error) {
                console.error('❌ Failed to set Supabase session with NextAuth tokens:', error)
                await fallbackSessionCreation()
              } else {
                console.log('✅ Successfully set Supabase session with NextAuth tokens')
                // Verify the session was actually set
                const { data: verifyData } = await supabase.auth.getUser()
                if (!verifyData.user) {
                  console.warn('⚠️ Set session succeeded but no user found, using fallback')
                  await fallbackSessionCreation()
                } else {
                  console.log('✅ User verified after setting session')
                  router.refresh()
                }
              }
            } catch (error) {
              console.error('❌ Error setting Supabase session:', error)
              await fallbackSessionCreation()
            }
          } else {
            // No tokens available, use fallback approach
            await fallbackSessionCreation()
          }
        }
      } catch (error) {
        console.error('❌ Unexpected error syncing auth state:', error)
      } finally {
        setIsSyncing(false)
      }
    }
    
    // Fallback to server API if direct tokens aren't available
    const fallbackSessionCreation = async () => {
      console.log('🔄 Falling back to server API for session creation')
      
      try {
        // Call our server API to get a session
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
          return
        }
        
        const data = await response.json()
        
        if (!data.properties?.access_token) {
          console.error('❌ API response missing token data:', data)
          return
        }
        
        // Set the session in Supabase
        const { error } = await supabase.auth.setSession({
          access_token: data.properties.access_token,
          refresh_token: data.properties.refresh_token
        })
        
        if (error) {
          console.error('❌ Failed to set Supabase session from API:', error)
        } else {
          console.log('✅ Successfully synced NextAuth session to Supabase via API')
          
          // Verify user to ensure session is valid
          const { data: userData, error: userError } = await supabase.auth.getUser()
          if (userError || !userData.user) {
            console.error('❌ Session set but user verification failed:', userError)
            await cleanupAuthState()
          } else {
            console.log('✅ User verified after API session sync:', userData.user.email)
            router.refresh()
          }
        }
      } catch (error) {
        console.error('❌ Error in fallback session creation:', error)
      }
    }
    
    // Call sync when NextAuth session changes
    if (nextAuthSession?.user) {
      syncAuthState()
    }
  }, [nextAuthSession, supabase, router, isSyncing, cleanupAuthState])

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