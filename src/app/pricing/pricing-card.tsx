'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import GlencairnGlass from '@/components/ui/icons/GlencairnGlass'
import { useBilling } from './billing-context'
import { useSupabase } from '@/components/providers/SupabaseProvider'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PricingCardProps {
  name: string
  monthlyPrice: number
  description: string
  features: string[]
  fillLevel: number
  ctaText: string
  ctaLink: string
  highlighted: boolean
  priceId?: string
  plan?: 'enthusiast' | 'connoisseur'
}

export function PricingCard({
  name,
  monthlyPrice,
  description,
  features,
  fillLevel,
  ctaText,
  ctaLink,
  highlighted,
  priceId,
  plan
}: PricingCardProps) {
  const { isAnnual, getPrice, getPriceId } = useBilling()
  const { isAuthenticated } = useSupabase()
  const [isLoading, setIsLoading] = useState(false)
  const displayPrice = getPrice(monthlyPrice)
  
  // Use the context function to get the price ID if plan is provided
  const effectivePriceId = plan ? getPriceId(plan) : priceId

  async function handleCheckout() {
    if (!effectivePriceId) return
    
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: effectivePriceId,
          isAnnual
        }),
      })
      
      const { url, error } = await response.json()
      
      if (error) {
        console.error('Error creating checkout session:', error)
        return
      }
      
      // Redirect to checkout
      window.location.href = url
    } catch (error) {
      console.error('Failed to create checkout session:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div 
      className={`bg-gray-800/50 rounded-xl ${
        highlighted ? 'shadow-xl border-2 border-amber-500 transform md:scale-105 z-10' : 'shadow-lg border border-gray-700'
      } overflow-hidden flex flex-col relative`}
    >
      {highlighted && (
        <div className="absolute top-0 inset-x-0 flex justify-center">
          <div className="bg-amber-500 text-xs font-bold uppercase tracking-wider text-black px-3 py-1 rounded-b-md">
            MOST POPULAR
          </div>
        </div>
      )}
      <div className={`p-6 border-b border-gray-700 bg-gradient-to-br ${
        highlighted ? 'from-amber-900/30 to-gray-900 pt-9' : 'from-gray-800 to-gray-900'
      }`}>
        <div className={`${
          highlighted ? 'bg-amber-600/20' : 'bg-amber-600/10'
        } w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
          <GlencairnGlass className="w-6 h-6 text-amber-500" fillLevel={fillLevel} fillColor="#d97706" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
        <div className="flex items-baseline">
          {monthlyPrice > 0 ? (
            <>
              <span className="text-4xl font-extrabold text-white">${displayPrice}</span>
              <span className="text-xl text-gray-400 ml-2">/month</span>
              {isAnnual && (
                <span className="ml-2 text-xs text-amber-500 font-medium">
                  billed annually
                </span>
              )}
            </>
          ) : (
            <span className="text-4xl font-extrabold text-white">Free</span>
          )}
        </div>
        <p className="mt-4 text-gray-400">{description}</p>
      </div>
      <div className="p-6 space-y-4 flex-grow">
        <ul className="space-y-3 text-sm">
          {features.map((feature, index) => (
            <li key={index} className="flex">
              <Check className="h-5 w-5 text-amber-500 mr-2 shrink-0" />
              <span className="text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-6 border-t border-gray-700 bg-gray-800">
        {monthlyPrice > 0 ? (
          <button 
            onClick={handleCheckout}
            disabled={isLoading || !isAuthenticated || !effectivePriceId}
            className={`block w-full py-3 px-4 rounded-lg ${
              highlighted 
                ? 'bg-amber-600 hover:bg-amber-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            } text-white font-medium text-center transition-colors ${
              (isLoading || !isAuthenticated || !effectivePriceId) ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Processing...' : !isAuthenticated ? 'Sign in to Subscribe' : ctaText}
          </button>
        ) : (
          <Link 
            href={ctaLink} 
            className={`block w-full py-3 px-4 rounded-lg ${
              highlighted 
                ? 'bg-amber-600 hover:bg-amber-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            } text-white font-medium text-center transition-colors`}
          >
            {ctaText}
          </Link>
        )}
      </div>
    </div>
  )
} 