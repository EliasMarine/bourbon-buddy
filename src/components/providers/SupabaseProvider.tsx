'use client'

import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useEffect, createContext, useContext } from 'react'

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

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  )
} 