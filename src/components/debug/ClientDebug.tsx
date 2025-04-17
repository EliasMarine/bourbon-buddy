'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

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

  // Return only the Script component to load the external script
  // All debugging logic is moved to the external file
  return (
    <Script
      id="client-debug-script"
      src="/client-debug-script.js"
      strategy="afterInteractive"
    />
  )
} 