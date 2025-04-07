import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import GlencairnGlass from '@/components/ui/icons/GlencairnGlass'

export const metadata: Metadata = {
  title: 'FAQ - Bourbon Buddy',
  description: 'Frequently asked questions about Bourbon Buddy - your personal bourbon collection manager and tasting companion',
}

export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-amber-600/20 rounded-full mb-4">
            <GlencairnGlass className="w-10 h-10 text-amber-500" fillLevel={75} fillColor="#d97706" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-gray-300">Everything you need to know about Bourbon Buddy</p>
        </div>

        <div className="space-y-8">
          {faqs.map((section, index) => (
            <div key={index} className="bg-gray-800/50 rounded-xl p-6 shadow-lg border border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-amber-500">{section.category}</h2>
              <div className="space-y-6">
                {section.questions.map((faq, faqIndex) => (
                  <div key={faqIndex} className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">{faq.question}</h3>
                    <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gray-800/50 rounded-xl p-8 shadow-lg border border-gray-700 text-center">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-gray-300 mb-6">
            Can't find the answer you're looking for? Please reach out to our customer support team.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/about" 
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
            >
              Contact Support
            </Link>
            <Link 
              href="/pricing" 
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const faqs = [
  {
    category: "Getting Started",
    questions: [
      {
        question: "What is Bourbon Buddy?",
        answer: "Bourbon Buddy is a platform designed for whiskey enthusiasts to track their bourbon collection, record tasting notes, and connect with other collectors through live tastings and community features."
      },
      {
        question: "How do I create an account?",
        answer: "Simply click the 'Sign Up' button in the top right corner of the page, fill in your details, and follow the verification process. Once complete, you'll have full access to all Bourbon Buddy features."
      },
      {
        question: "Is Bourbon Buddy free to use?",
        answer: "Bourbon Buddy offers both free and premium tiers. The free tier allows you to track up to 25 bottles in your collection, while premium tiers offer unlimited collection tracking, advanced analytics, and exclusive features."
      }
    ]
  },
  {
    category: "Collection Management",
    questions: [
      {
        question: "How do I add bottles to my collection?",
        answer: "Navigate to your collection page and click the 'Add Bottle' button. You can search for bottles in our database or add custom entries with details like distillery, age, proof, and purchase price."
      },
      {
        question: "Can I track how much whiskey is left in each bottle?",
        answer: "Yes! Our unique bottle level tracking feature allows you to visually represent how full each bottle is. Simply adjust the slider when you pour a drink to keep your collection up to date."
      },
      {
        question: "How do I add tasting notes?",
        answer: "Select any bottle in your collection and click 'Add Tasting Note'. You can record your impressions of the nose, palate, finish, and give an overall rating. Photos can also be added to your notes."
      }
    ]
  },
  {
    category: "Live Tastings",
    questions: [
      {
        question: "How do I join a live tasting?",
        answer: "Browse the 'Live Tastings' section to see upcoming events. Click on any tasting to view details and join the stream at the scheduled time. You'll be able to interact with hosts and other participants in real-time."
      },
      {
        question: "Can I host my own tasting session?",
        answer: "Absolutely! Premium users can schedule and host their own tastings. Set a date and time, select bottles from your collection to feature, and invite friends or make it public for anyone to join."
      },
      {
        question: "What equipment do I need for live tastings?",
        answer: "At minimum, you'll need a device with a camera and microphone. For the best experience, we recommend good lighting, a neutral background, and of course, your favorite bourbon!"
      }
    ]
  },
  {
    category: "Account & Billing",
    questions: [
      {
        question: "How do I upgrade to a premium account?",
        answer: "Visit the Pricing page and select the plan that suits your needs. You can pay monthly or annually with all major credit cards and PayPal."
      },
      {
        question: "Can I cancel my subscription anytime?",
        answer: "Yes, you can cancel your premium subscription at any time from your account settings. You'll continue to have premium access until the end of your billing period."
      },
      {
        question: "Is my payment information secure?",
        answer: "Absolutely. We use industry-standard encryption and never store your full credit card details. All payments are processed through secure, PCI-compliant payment providers."
      }
    ]
  }
] 