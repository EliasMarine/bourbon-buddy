'use client'

import { useEffect, useState } from 'react'

export default function ClientDebug() {
  const [info, setInfo] = useState<Record<string, any>>({
    loaded: false,
    error: null,
    windowSize: { width: 0, height: 0 },
    userAgent: '',
    href: '',
    pathname: '',
    timestamp: new Date().toISOString(),
    supportsLocalStorage: false
  })

  useEffect(() => {
    try {
      // Log startup
      console.log('🔍 Debug component mounted', new Date().toISOString())
      
      // Basic environment info
      const envInfo = {
        loaded: true,
        windowSize: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        userAgent: window.navigator.userAgent,
        href: window.location.href,
        pathname: window.location.pathname,
        supportsLocalStorage: typeof localStorage !== 'undefined',
        timestamp: new Date().toISOString(),
        isDev: process.env.NODE_ENV === 'development'
      }
      
      console.log('🌍 Environment info:', envInfo)
      setInfo(envInfo)

      // Check for environment variables access
      console.log('📝 NEXT_PUBLIC vars available:', {
        SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || '(not set)',
        APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '(not set)',
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '(set)' : '(not set)',
        SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '(set)' : '(not set)'
      })

      // Document structure
      console.log('📄 Document structure:', {
        title: document.title,
        headChildrenCount: document.head.children.length,
        bodyChildrenCount: document.body.children.length,
        hasHtml: !!document.documentElement,
        hasBody: !!document.body
      })

      // Check for common errors
      if (document.body.children.length === 0) {
        console.warn('⚠️ Body has no children - possible blank page issue')
      }

      // Store debug info in localStorage for easier retrieval
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('debugInfo', JSON.stringify(envInfo))
        localStorage.setItem('debugTimestamp', new Date().toISOString())
      }
    } catch (err) {
      console.error('🔥 Debug error:', err)
      setInfo(prev => ({ ...prev, error: err instanceof Error ? err.message : String(err) }))
    }
  }, [])

  // If in production, this component is invisible
  // In development, you can make it visible by uncommenting the return statement below
  
  return null
  
  /* For development debugging, uncomment this:
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        zIndex: 9999,
        padding: '8px',
        background: 'rgba(0,0,0,0.8)',
        color: 'lime',
        fontSize: '12px',
        maxWidth: '300px',
        maxHeight: '200px',
        overflow: 'auto',
        border: '1px solid lime',
        borderRadius: '4px'
      }}
    >
      <pre>{JSON.stringify(info, null, 2)}</pre>
    </div>
  )
  */
} 