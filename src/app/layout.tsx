import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { headers } from 'next/headers'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ClientLayout from '../components/providers/ClientLayout'
import SupabaseProvider from '../components/providers/SupabaseProvider'
import AuthWrapper from '../components/auth/AuthWrapper'
import EmergencyDebug from '../components/debug/EmergencyDebug'
import ClientDebug from '../components/debug/ClientDebug'
import CorsHandler from '../components/cors-handler'
import { initSentry } from '@/lib/sentry'
import React from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Bourbon Buddy',
  description: 'Your personal bourbon collection manager and streaming platform',
  icons: {
    icon: [
      { url: '/images/svg%20logo%20icon/Glencairn/Bourbon%20Budy%20(200%20x%2050%20px)%20(Logo)(1).svg', type: 'image/svg+xml' }
    ],
    apple: [
      { url: '/images/svg%20logo%20icon/Glencairn/Bourbon%20Budy%20(200%20x%2050%20px)%20(Logo)(1).svg', type: 'image/svg+xml' }
    ]
  }
}

// Initialize Sentry on client-side only
if (typeof window !== 'undefined') {
  initSentry()
}

// Make the component async
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read nonce from headers during server rendering
  const headersList = await headers() // Await the headers
  const nonce = headersList.get('x-csp-nonce') || (process.env.NODE_ENV !== 'production' ? 'development-nonce' : undefined)
  
  return (
    <html lang="en" className="dark" id="app-root">
      <head>
        <link rel="icon" href="/images/svg%20logo%20icon/Glencairn/Bourbon%20Budy%20(200%20x%2050%20px)%20(Logo)(1).svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/images/svg%20logo%20icon/Glencairn/Bourbon%20Budy%20(200%20x%2050%20px)%20(Logo)(1).svg" type="image/svg+xml" />
        
        {/* Make nonce available to client components if it exists */}
        {nonce && <meta property="csp-nonce" content={nonce} />}
        
        {/* Properly preload the debug scripts with correct attributes */}
        {process.env.NODE_ENV !== 'production' && (
          <>
            <link 
              rel="preload" 
              href="/debug-script.js" 
              as="script"
              nonce={nonce}
              crossOrigin="anonymous"
            />
            <link 
              rel="preload" 
              href="/client-debug-script.js" 
              as="script"
              nonce={nonce}
              crossOrigin="anonymous"
            />
          </>
        )}
      </head>
      <body className={`${inter.className} min-h-screen bg-gray-900 text-white`} id="app-body">
        {/* Only include debug components in development */}
        {process.env.NODE_ENV !== 'production' && (
          <>
            <EmergencyDebug />
            <ClientDebug />
          </>
        )}
        
        <SupabaseProvider>
          <ClientLayout>
            <CorsHandler />
            <Navbar />
            <main className="pt-16">
              <AuthWrapper>
                {children}
              </AuthWrapper>
            </main>
            <Footer />
            <Toaster position="top-right" richColors theme="dark" />
          </ClientLayout>
        </SupabaseProvider>
      </body>
    </html>
  )
}
