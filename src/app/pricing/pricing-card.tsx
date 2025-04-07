'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import GlencairnGlass from '@/components/ui/icons/GlencairnGlass'
import { useBilling } from './billing-context'

interface PricingCardProps {
  name: string
  monthlyPrice: number
  description: string
  features: string[]
  fillLevel: number
  ctaText: string
  ctaLink: string
  highlighted: boolean
}

export function PricingCard({
  name,
  monthlyPrice,
  description,
  features,
  fillLevel,
  ctaText,
  ctaLink,
  highlighted
}: PricingCardProps) {
  const { isAnnual, getPrice } = useBilling()
  const displayPrice = getPrice(monthlyPrice)
  
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
      </div>
    </div>
  )
} 