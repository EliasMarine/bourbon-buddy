import './globals.css'
import { Inter } from 'next/font/google'
import { SupabaseProvider } from '../components/providers/SupabaseProvider'
import { Toaster } from "sonner"
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next';
import { headers } from 'next/headers';
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import React from 'react'

// If loading a variable font, you don't need to specify the font weight
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the CSP nonce from the headers
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') || ''
  
  return (
    <html lang="en" className="dark" id="app-root">
      <head>
        <link rel="icon" href="/images/svg%20logo%20icon/Glencairn/Bourbon%20Budy%20(200%20x%2050%20px)%20(Logo)(1).svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/images/svg%20logo%20icon/Glencairn/Bourbon%20Budy%20(200%20x%2050%20px)%20(Logo)(1).svg" type="image/svg+xml" />
        
        {/* Make nonce available to client components */}
        {nonce && <meta name="x-nonce" content={nonce} />}
      </head>
      <body className={`${inter.className} min-h-screen bg-gray-900 text-white`} id="app-body">
        <SupabaseProvider>
          <Navbar />
          <main className="pt-16">
            {children}
          </main>
          <Footer />
          <Toaster position="top-right" richColors theme="dark" />
        </SupabaseProvider>
        <Analytics />
      </body>
    </html>
  )
}
