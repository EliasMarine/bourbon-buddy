'use client'

import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useEffect, createContext, useContext } from 'react'
import { useSession } from 'next-auth/react'

const SupabaseContext = createContext<ReturnType<typeof createBrowserClient> | undefined>(undefined)

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

export default function SupabaseProvider({ 
  children 
}: { 
  children: React.ReactNode
}) {
  const [supabase] = useState(() => createBrowserClient())
  const router = useRouter()
  const { data: nextAuthSession } = useSession()
  const [isAuthSyncing, setIsAuthSyncing] = useState(false)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Supabase auth event:', event, session?.user?.email || 'no session')
      
      if (event === 'SIGNED_IN') {
        // Refresh the page to update the UI with new auth state
        router.refresh()
      } else if (event === 'SIGNED_OUT') {
        // Redirect to login or refresh
        router.refresh()
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Supabase token refreshed')
        // Silently refresh the page to ensure fresh data
        router.refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  // Sync NextAuth session with Supabase
  useEffect(() => {
    const syncAuthState = async () => {
      // Skip if already syncing or no NextAuth session
      if (isAuthSyncing || !nextAuthSession?.user?.email) return
      
      console.log('Checking Supabase session status', { 
        hasNextAuthSession: !!nextAuthSession, 
        hasNextAuthAccessToken: !!nextAuthSession?.accessToken 
      })
      
      // Check if already signed in to Supabase
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      
      // If not signed in to Supabase but signed in to NextAuth
      if (!supabaseSession && nextAuthSession.user.email) {
        console.log('Syncing NextAuth session to Supabase', nextAuthSession.user.email)
        setIsAuthSyncing(true)
        
        try {
          // If we have the access token directly from NextAuth, use it
          if (nextAuthSession.accessToken && nextAuthSession.refreshToken) {
            console.log('Using NextAuth access token to set Supabase session')
            
            const { error } = await supabase.auth.setSession({
              access_token: nextAuthSession.accessToken,
              refresh_token: nextAuthSession.refreshToken || ''
            })
            
            if (error) {
              console.error('Failed to set Supabase session with NextAuth tokens:', error)
              await fallbackSessionCreation()
            } else {
              console.log('Successfully set Supabase session with NextAuth tokens')
              router.refresh() 
            }
          } else {
            // No tokens available, use fallback approach
            await fallbackSessionCreation()
          }
        } catch (error) {
          console.error('Error syncing auth state:', error)
        } finally {
          setIsAuthSyncing(false)
        }
      }
    }
    
    // Fallback to server API if direct tokens aren't available
    const fallbackSessionCreation = async () => {
      console.log('Falling back to server API for session creation')
      
      try {
        // Call our server API to get a session
        const response = await fetch('/api/auth/supabase-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Failed to get Supabase session from API:', errorData)
          return
        }
        
        const { properties } = await response.json()
        
        // Set the session in Supabase
        const { error } = await supabase.auth.setSession({
          access_token: properties.access_token,
          refresh_token: properties.refresh_token
        })
        
        if (error) {
          console.error('Failed to set Supabase session from API:', error)
        } else {
          console.log('Successfully synced NextAuth session to Supabase via API')
          router.refresh() 
        }
      } catch (error) {
        console.error('Error in fallback session creation:', error)
      }
    }
    
    syncAuthState()
  }, [nextAuthSession, supabase, router, isAuthSyncing])

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  )
} 