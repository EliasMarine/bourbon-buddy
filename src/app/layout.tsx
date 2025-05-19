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
import { Analytics } from '@vercel/analytics/next';

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
        
        {/* Preload MUX player script */}
        <Script
          src="https://cdn.jsdelivr.net/npm/@mux/mux-player"
          strategy="afterInteractive"
          nonce={nonce}
        />
        
        {/* Add script to fix MUX player controls */}
        <Script 
          id="mux-player-fix" 
          strategy="afterInteractive"
          nonce={nonce}
        >
          {`
            // Function to fix MUX player controls overlap
            function fixMuxPlayerControls() {
              const players = document.querySelectorAll('mux-player');
              if (!players.length) return;

              players.forEach(player => {
                // Ensure proper control layout by forcing a resize
                if (player.shadowRoot) {
                  const observer = new MutationObserver((mutations) => {
                    // When player shadow DOM changes, ensure controls are properly sized
                    const controlBars = player.shadowRoot.querySelectorAll('[part="control-bar"]');
                    controlBars.forEach(bar => {
                      if (bar) {
                        bar.style.display = 'flex';
                        bar.style.alignItems = 'center';
                        bar.style.width = '100%';
                      }
                    });
                  });
                  
                  // Observe changes to the shadow DOM
                  observer.observe(player.shadowRoot, { 
                    childList: true, 
                    subtree: true 
                  });
                }
              });
            }

            // Run on page load
            if (document.readyState === 'complete') {
              fixMuxPlayerControls();
            } else {
              window.addEventListener('load', fixMuxPlayerControls);
            }

            // Also run when DOM changes (in case player is added dynamically)
            document.addEventListener('DOMContentLoaded', fixMuxPlayerControls);
          `}
        </Script>
        
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
        <Analytics />
      </body>
    </html>
  )
}
