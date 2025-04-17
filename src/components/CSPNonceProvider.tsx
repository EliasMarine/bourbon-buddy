'use client'

import React, { createContext, useContext } from 'react'

// Create a context to store and provide the nonce
interface CSPNonceContextType {
  nonce: string | null
}

const CSPNonceContext = createContext<CSPNonceContextType>({ nonce: null })

// Hook to use the nonce in any component
export function useCSPNonce() {
  return useContext(CSPNonceContext)
}

// Provider component to be used in layout
export function CSPNonceProvider({ 
  children, 
  nonce 
}: { 
  children: React.ReactNode
  nonce: string | null
}) {
  return (
    <CSPNonceContext.Provider value={{ nonce }}>
      {children}
    </CSPNonceContext.Provider>
  )
} 