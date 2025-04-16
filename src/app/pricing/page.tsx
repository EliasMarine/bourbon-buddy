import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { Check } from 'lucide-react'
import GlencairnGlass from '@/components/ui/icons/GlencairnGlass'
import Image from 'next/image'
import { BillingToggle } from './billing-toggle'
import { BillingProvider } from './billing-context'
import { PricingCard } from './pricing-card'

export const metadata: Metadata = {
  title: 'Pricing - Bourbon Buddy',
  description: 'Bourbon Buddy pricing plans - from free to premium options for bourbon enthusiasts and collectors',
}

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-1">
            <Image 
              src="/images/svg logo icon/Glencairn/Bourbon Budy (200 x 50 px) (Logo)(1).png"
              alt="Bourbon Buddy Logo"
              width={200}
              height={50}
              priority
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Choose the perfect plan for your bourbon journey. Upgrade or downgrade anytime.
          </p>
        </div>

        <BillingProvider>
          {/* Billing Toggle */}
          <BillingToggle />

          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <PricingCard
              name="Free"
              monthlyPrice={0}
              description="Perfect for casual enthusiasts getting started with bourbon tracking."
              features={freeFeatures}
              fillLevel={25}
              ctaText="Get Started"
              ctaLink="/signup"
              highlighted={false}
            />

            {/* Enthusiast Plan */}
            <PricingCard
              name="Enthusiast"
              monthlyPrice={9.99}
              description="For serious collectors building their bourbon library."
              features={enthusiastFeatures}
              fillLevel={50}
              ctaText="Subscribe Now"
              ctaLink="/signup?plan=enthusiast"
              highlighted={true}
              plan="enthusiast"
            />

            {/* Connoisseur Plan */}
            <PricingCard
              name="Connoisseur"
              monthlyPrice={19.99}
              description="For dedicated aficionados with extensive collections."
              features={connoisseurFeatures}
              fillLevel={90}
              ctaText="Subscribe Now"
              ctaLink="/signup?plan=connoisseur"
              highlighted={false}
              plan="connoisseur"
            />
          </div>
        </BillingProvider>

        {/* FAQ Section */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {pricingFaqs.map((faq, index) => (
              <div key={index} className="bg-gray-800/30 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-3">{faq.question}</h3>
                <p className="text-gray-300">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const freeFeatures = [
  "Track up to 25 bottles in your collection",
  "Basic tasting notes",
  "Bottle level tracking",
  "View community live tastings",
  "Public profile page",
  "Access to bourbon database",
]

const enthusiastFeatures = [
  "Everything in Free plan, plus:",
  "Unlimited bottles in your collection",
  "Advanced tasting notes with photos",
  "Host up to 5 live tastings per month",
  "Collection analytics & insights",
  "Collection value tracking",
  "Private tasting groups",
  "Premium profile customization",
  "No ads experience",
]

const connoisseurFeatures = [
  "Everything in Enthusiast plan, plus:",
  "Unlimited live tastings",
  "Priority support",
  "Advanced collection analytics & data export",
  "Exclusive early access to new features",
  "Collection insurance valuation reports",
  "Vintage bottle authentication assistance",
  "Invite-only tastings with distillers",
  "Private collection sharing controls",
]

const pricingFaqs = [
  {
    question: "Can I switch between plans?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference for the remainder of your billing cycle. When downgrading, your new plan will take effect at the start of your next billing cycle."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover) and PayPal. All payments are processed securely through our payment processor."
  },
  {
    question: "Is there a free trial for paid plans?",
    answer: "We offer a 14-day free trial for the Enthusiast plan. You can cancel anytime during the trial period and won't be charged."
  },
  {
    question: "What happens to my data if I downgrade?",
    answer: "If you downgrade from a paid plan to the Free plan, you'll retain access to all your data, but some features will be restricted. If you have more than 25 bottles, you won't be able to add new bottles until you're under the limit, but all your existing collection data will be preserved."
  }
] 