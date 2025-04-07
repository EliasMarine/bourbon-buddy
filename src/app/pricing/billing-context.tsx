'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface BillingContextType {
  isAnnual: boolean
  setIsAnnual: (value: boolean) => void
  getPrice: (monthlyPrice: number) => string
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

  return (
    <BillingContext.Provider value={{ isAnnual, setIsAnnual, getPrice }}>
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