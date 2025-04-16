'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { checkSupabaseConnection, forceSessionRefreshViaProxy } from '@/lib/cors-helper'
import { getSupabaseClient, resetSupabaseClient } from '@/lib/supabase-singleton'

/**
 * Component that detects and handles CORS issues with Supabase
 * Should be placed high in the component tree
 */
export function CorsHandler() {
  const [corsStatus, setCorsStatus] = useState<'checking' | 'ok' | 'error'>('checking')
  const pathname = usePathname()

  // Check if this is a login/auth page where we don't expect a session
  const isAuthPage = pathname === '/login' || 
                    pathname === '/signup' || 
                    pathname === '/register' || 
                    pathname === '/forgot-password' ||
                    pathname === '/reset-password' ||
                    pathname?.startsWith('/auth/')
  
  useEffect(() => {
    // Don't run on server side
    if (typeof window === 'undefined') return

    // Skip on auth pages - no need to fix CORS for initial login
    if (isAuthPage) {
      console.log('Auth page detected, skipping CORS check')
      setCorsStatus('ok')
      return
    }

    // Only run once per session
    const alreadyRan = sessionStorage.getItem('cors-checker-ran')
    if (alreadyRan === 'true') {
      setCorsStatus('ok')
      return
    }

    async function checkAndFixCors() {
      try {
        // Check if direct Supabase connection works
        const connectionOk = await checkSupabaseConnection()
        
        if (connectionOk) {
          console.log('Supabase CORS connection OK')
          setCorsStatus('ok')
          sessionStorage.setItem('cors-checker-ran', 'true')
          return
        }
        
        console.warn('Potential CORS issues detected, attempting to fix...')
        
        // Get current session from storage if available
        let refreshToken = null
        
        // Try to get the refresh token from localStorage
        try {
          const supabase = getSupabaseClient()
          const { data } = await supabase.auth.getSession()
          
          if (data.session?.refresh_token) {
            refreshToken = data.session.refresh_token
          }
        } catch (e) {
          console.error('Error getting session:', e)
        }
        
        if (!refreshToken) {
          console.warn('No refresh token available, cannot fix CORS issues')
          // On auth pages, we don't need a token to continue
          if (isAuthPage) {
            setCorsStatus('ok')
          } else {
            setCorsStatus('error')
          }
          return
        }
        
        // Try to refresh via our proxy
        const refreshSuccess = await forceSessionRefreshViaProxy(refreshToken)
        
        if (refreshSuccess) {
          // Reset the client to use new session
          resetSupabaseClient()
          setCorsStatus('ok')
          sessionStorage.setItem('cors-checker-ran', 'true')
          console.log('CORS issues fixed via proxy')
        } else {
          setCorsStatus('error')
          console.error('Unable to fix CORS issues')
        }
      } catch (error) {
        console.error('Error in CORS check:', error)
        setCorsStatus('error')
      }
    }

    checkAndFixCors()
  }, [isAuthPage])

  // This component doesn't render anything visible
  return null
}

export default CorsHandler 