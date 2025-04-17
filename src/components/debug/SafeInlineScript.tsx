'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { getCSPNonce } from '@/lib/csp-client'

/**
 * SafeInlineScript - A component that handles inline scripts in a CSP-compliant way
 * This version uses external scripts and data URLs to avoid CSP issues
 * 
 * @param props.id - Unique identifier for the script
 * @param props.code - JavaScript code to execute
 * @param props.strategy - Script loading strategy
 */
export default function SafeInlineScript({ 
  id, 
  code, 
  strategy = 'afterInteractive'
}: { 
  id: string
  code: string 
  strategy?: 'afterInteractive' | 'beforeInteractive' | 'lazyOnload' | 'worker'
}) {
  // Get nonce for CSP compliance
  const [nonce, setNonce] = useState<string | undefined>(undefined)
  
  useEffect(() => {
    // Try to get the nonce from the DOM after component mounts
    setNonce(getCSPNonce())
  }, [])
  
  // Create a data URL from the code to avoid inline scripts
  const scriptUrl = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  
  return (
    <Script
      id={id}
      src={scriptUrl}
      strategy={strategy}
      nonce={nonce}
    />
  )
} 