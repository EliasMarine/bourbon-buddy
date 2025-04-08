import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ClientLayout from '../components/providers/ClientLayout'
import SupabaseProvider from '@/components/providers/SupabaseProvider'

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/images/svg%20logo%20icon/Glencairn/Bourbon%20Budy%20(200%20x%2050%20px)%20(Logo)(1).svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/images/svg%20logo%20icon/Glencairn/Bourbon%20Budy%20(200%20x%2050%20px)%20(Logo)(1).svg" type="image/svg+xml" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gray-900 text-white`}>
        <SupabaseProvider>
          <ClientLayout>
            <Navbar />
            <main className="pt-16">
              {children}
            </main>
            <Footer />
            <Toaster position="top-right" richColors theme="dark" />
          </ClientLayout>
        </SupabaseProvider>
      </body>
    </html>
  )
} 