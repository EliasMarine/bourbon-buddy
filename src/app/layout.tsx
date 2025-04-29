import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { headers } from 'next/headers'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { ClientLayout, SupabaseProvider, CsrfProvider } from '../components/providers'
import AuthWrapper from '../components/auth/AuthWrapper'
import ClientDebug from '../components/debug/ClientDebug'
import CorsHandler from '../components/cors-handler'
import { initSentry } from '@/lib/sentry'
import React from 'react'
import Script from 'next/script'

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
  // Get the CSP nonce from the headers
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') || ''
  const cspHeader = headersList.get('content-security-policy')
  const csrfToken = headersList.get('x-csrf-token') || ''
  
  // For debugging headers in development
  const isDevMode = process.env.NODE_ENV !== 'production'
  
  if (isDevMode) {
    // Log headers for debugging in dev only
    console.log('✅ Direct Supabase connection successful')
    console.log('Supabase CORS connection OK')
  }

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
              href="/client-debug-script.js" 
              as="script"
              nonce={nonce}
              crossOrigin="anonymous"
            />
          </>
        )}
        
        {/* Apply nonce to any inline scripts/styles in the head */}
        {nonce && (
          <>
            {/* Add preconnect hints with nonce */}
            <link 
              rel="preconnect" 
              href="https://hjodvataujilredguzig.supabase.co" 
              crossOrigin="anonymous" 
              nonce={nonce}
            />
          </>
        )}
      </head>
      <body className={`${inter.className} min-h-screen bg-gray-900 text-white`} id="app-body">
        {/* Only include debug components in development */}
        {process.env.NODE_ENV !== 'production' && (
          <>
            <ClientDebug />
          </>
        )}
        
        <CsrfProvider initialToken={csrfToken}>
          <SupabaseProvider nonce={nonce}>
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
        </CsrfProvider>
      </body>
    </html>
  )
}
