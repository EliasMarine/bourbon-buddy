'use client'

import Script from 'next/script'

export default function EmergencyDebug() {
  return (
    <>
      <Script
        id="emergency-debug"
        src="/debug-script.js"
        strategy="beforeInteractive"
      />
    </>
  )
} 