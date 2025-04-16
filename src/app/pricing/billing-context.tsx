'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Price IDs from Stripe Dashboard
// You would replace these with your actual Stripe price IDs
const PRICE_IDS = {
  enthusiast: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTHUSIAST_MONTHLY || 'price_enthusiast_monthly',
    annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTHUSIAST_ANNUAL || 'price_enthusiast_annual',
  },
  connoisseur: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_CONNOISSEUR_MONTHLY || 'price_connoisseur_monthly',
    annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_CONNOISSEUR_ANNUAL || 'price_connoisseur_annual',
  }
}

interface BillingContextType {
  isAnnual: boolean
  setIsAnnual: (value: boolean) => void
  getPrice: (monthlyPrice: number) => string
  getPriceId: (plan: 'enthusiast' | 'connoisseur') => string
}

const BillingContext = createContext<BillingContextType | undefined>(undefined)

export function BillingProvider({ children }: { children: ReactNode }) {
  const [isAnnual, setIsAnnual] = useState(false)
  
  const getPrice = (monthlyPrice: number): string => {
    if (isAnnual) {
      // Apply 20% discount for annual and show per month price
      const annualPrice = (monthlyPrice * 12 * 0.8) / 12
      return annualPrice.toFixed(2)
    }
    return monthlyPrice.toFixed(2)
  }

  const getPriceId = (plan: 'enthusiast' | 'connoisseur'): string => {
    if (!PRICE_IDS[plan]) return ''
    return isAnnual ? PRICE_IDS[plan].annual : PRICE_IDS[plan].monthly
  }

  return (
    <BillingContext.Provider value={{ isAnnual, setIsAnnual, getPrice, getPriceId }}>
      {children}
    </BillingContext.Provider>
  )
}

export function useBilling() {
  const context = useContext(BillingContext)
  
  if (context === undefined) {
    throw new Error('useBilling must be used within a BillingProvider')
  }
  
  return context
} 