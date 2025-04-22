'use client'

import { useEffect, useState } from 'react'
import Script, { ScriptProps } from 'next/script'

/**
 * NonceScript - A wrapper around Next.js Script component that adds nonce support
 * This ensures that scripts are loaded with the correct CSP nonce
 */
export default function NonceScript(props: ScriptProps) {
  const [mounted, setMounted] = useState(false)
  const [nonce, setNonce] = useState<string>('')
  
  useEffect(() => {
    setMounted(true)
    
    // Try to get the nonce from different sources
    // 1. From meta tag with property="csp-nonce"
    const metaNonce = document.querySelector('meta[property="csp-nonce"]')?.getAttribute('content')
    
    // 2. Or from any script tag that might have a nonce (Next.js might add it)
    const scriptNonce = !metaNonce ? document.querySelector('script[nonce]')?.getAttribute('nonce') : undefined
    
    setNonce(metaNonce || scriptNonce || '')
  }, [])
  
  // During server rendering, don't include the nonce attribute at all
  if (!mounted) {
    return <Script {...props} />
  }
  
  // Only provide nonce client-side after mount
  return (
    <Script
      {...props}
      nonce={nonce || undefined}
    />
  )
} 