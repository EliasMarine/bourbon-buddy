'use client'

import { useBilling } from './billing-context'

export function BillingToggle() {
  const { isAnnual, setIsAnnual } = useBilling()

  return (
    <div className="flex justify-center items-center space-x-4 mb-12">
      <span className={`text-lg font-medium ${isAnnual ? 'text-gray-400' : 'text-amber-500'}`}>
        Monthly
      </span>
      <button
        onClick={() => setIsAnnual(!isAnnual)}
        className="w-16 h-8 flex items-center bg-gray-700 rounded-full p-1 cursor-pointer transition-all hover:bg-gray-600"
        aria-label={isAnnual ? 'Switch to monthly billing' : 'Switch to annual billing'}
      >
        <div 
          className={`bg-amber-500 w-6 h-6 rounded-full shadow-md transition-transform transform duration-300 ease-in-out ${
            isAnnual ? 'translate-x-8' : 'translate-x-0'
          }`} 
        />
      </button>
      <div className="flex items-center">
        <span className={`text-lg font-medium ${isAnnual ? 'text-amber-500' : 'text-gray-400'}`}>
          Annual
        </span>
        <span className={`text-xs font-medium bg-amber-500/20 text-amber-500 px-2 py-0.5 ml-2 rounded-full border border-amber-500/30`}>
          Save 20%
        </span>
      </div>
    </div>
  )
} 