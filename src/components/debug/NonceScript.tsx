'use client'

import Script, { ScriptProps } from 'next/script'

// Add nonce to the props interface
interface NonceScriptProps extends ScriptProps {
  nonce?: string;
}

/**
 * NonceScript - A wrapper around Next.js Script component that uses a passed nonce.
 * This component assumes the nonce is passed down as a prop from a server component (e.g., RootLayout)
 * that reads it from request headers.
 */
export default function NonceScript({ nonce, ...props }: NonceScriptProps) {
  // Remove client-side state and effect for fetching nonce
  // const [mounted, setMounted] = useState(false)
  // const [nonce, setNonce] = useState<string>('')
  // 
  // useEffect(() => {
  //   setMounted(true)
  //   
  //   // Try to get the nonce from different sources
  //   // 1. From meta tag with property="csp-nonce"
  //   const metaNonce = document.querySelector('meta[property="csp-nonce"]')?.getAttribute('content')
  //   
  //   // 2. Or from any script tag that might have a nonce (Next.js might add it)
  //   const scriptNonce = !metaNonce ? document.querySelector('script[nonce]')?.getAttribute('nonce') : undefined
  //   
  //   setNonce(metaNonce || scriptNonce || '')
  // }, [])
  
  // Always pass the nonce prop (if provided) to the Script component
  // The nonce should be consistent between server and client render this way.
  return (
    <Script
      {...props}
      nonce={nonce} // Pass the received nonce directly
    />
  )
} 