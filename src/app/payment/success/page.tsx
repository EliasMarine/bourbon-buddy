import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Payment Successful - Bourbon Buddy',
  description: 'Your subscription has been processed successfully',
}

export default function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  const sessionId = searchParams.session_id

  return (
    <div className="container max-w-lg mx-auto px-4 py-16">
      <div className="flex flex-col items-center justify-center space-y-8 text-center">
        <div className="flex justify-center mb-4">
          <Image 
            src="/images/svg logo icon/Glencairn/Bourbon Budy (200 x 50 px) (Logo)(1).png"
            alt="Bourbon Buddy Logo"
            width={200}
            height={50}
            priority
          />
        </div>
        
        <div className="flex items-center justify-center w-24 h-24 rounded-full bg-green-100/20">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-white">Payment Successful!</h1>
        
        <p className="text-gray-300 text-lg">
          Thank you for subscribing to Bourbon Buddy. Your payment has been processed successfully.
        </p>
        
        <div className="bg-gray-800/50 rounded-lg p-6 w-full">
          <h2 className="text-lg font-medium text-white mb-2">Order Details</h2>
          <p className="text-gray-300 text-sm mb-1">
            Session ID: <span className="text-amber-400">{sessionId || 'N/A'}</span>
          </p>
          <p className="text-gray-300 text-sm">
            A confirmation email has been sent to your registered email address.
          </p>
        </div>
        
        <div className="flex flex-col gap-4 w-full">
          <Link 
            href="/collection"
            className="w-full py-3 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-center transition-colors"
          >
            View My Collection
          </Link>
          
          <Link 
            href="/"
            className="w-full py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium text-center transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
} 