'use client'

import NonceScript from './NonceScript'

export default function EmergencyDebug() {
  return (
    <>
      <NonceScript
        id="emergency-debug"
        src="/debug-script.js"
        strategy="beforeInteractive"
      />
    </>
  )
} 