import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'
import GlencairnGlass from '@/components/ui/icons/GlencairnGlass'

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="flex flex-col-reverse lg:flex-row items-center gap-12 mb-20">
          <div className="lg:w-1/2">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Elevate Your Bourbon Experience</h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Bourbon Buddy helps enthusiasts catalog, track, and share their whiskey journey with precision and style. From rare finds to everyday favorites, manage your collection with ease.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/signup" 
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium text-center"
              >
                Start Your Collection
              </Link>
              <Link 
                href="/explore" 
                className="px-6 py-3 border border-gray-600 hover:bg-gray-800 text-white rounded-lg transition-colors font-medium text-center"
              >
                Explore Features
              </Link>
            </div>
          </div>
          <div className="lg:w-1/2 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-amber-600/5 rounded-2xl transform -rotate-3 scale-95 -z-10"></div>
            <div className="rounded-2xl overflow-hidden border border-gray-700 shadow-xl">
              <Image 
                src="/images/about page/ferals-studio-gde1vDilHSw-unsplash.jpg" 
                alt="Bourbon with orange peel garnish" 
                width={600}
                height={450}
                className="w-full h-auto max-h-[450px] object-cover"
                priority
              />
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="mb-20 bg-gradient-to-br from-gray-800/50 to-gray-900/70 rounded-xl p-10 shadow-lg border border-gray-700">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 text-amber-500">Our Mission</h2>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              Bourbon Buddy was created with a simple mission: to help whiskey enthusiasts track, organize, and share their collections with unparalleled precision and sophistication. We believe that bourbon is more than just a spirit—it's a journey of discovery, appreciation, and community.
            </p>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              {missionsPoints.map((point, index) => (
                <div key={index} className="bg-gray-800/60 p-6 rounded-lg border border-gray-700">
                  <div className="inline-flex items-center justify-center p-3 bg-amber-600/10 rounded-full mb-4">
                    {point.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white">{point.title}</h3>
                  <p className="text-gray-300">{point.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-white">Premium Features</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to manage your collection like a true connoisseur
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-800/50 rounded-xl p-6 shadow-lg border border-gray-700 hover:border-amber-500/30 transition-colors group">
                <div className="flex items-start">
                  <span className="bg-amber-600/20 p-2 rounded-lg mr-4 group-hover:bg-amber-600/30 transition-colors">
                    {feature.icon}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                    <p className="text-gray-300 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="mb-20 bg-gradient-to-br from-amber-900/20 to-gray-900/50 rounded-xl p-10 shadow-lg border border-amber-900/20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-center text-white">What Bourbon Lovers Say</h2>
            <p className="text-xl text-gray-300 mb-10 text-center">
              Join thousands of enthusiasts who've elevated their bourbon experience
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-gray-800/60 rounded-xl p-6 shadow-lg border border-gray-700">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-500 font-bold text-xl mr-4">
                      {testimonial.initial}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{testimonial.name}</h3>
                      <p className="text-gray-400 text-sm">{testimonial.location}</p>
                    </div>
                  </div>
                  <p className="text-gray-300 italic leading-relaxed">"{testimonial.quote}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mb-12 grid md:grid-cols-2 gap-8">
          <div className="bg-gray-800/50 rounded-xl p-8 shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-amber-500">Get In Touch</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Have questions, suggestions, or just want to talk bourbon? We'd love to hear from you! Reach out to our team anytime.
            </p>
            
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full bg-gray-700 border-0 rounded-lg text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full bg-gray-700 border-0 rounded-lg text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full bg-gray-700 border-0 rounded-lg text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="How can we help?"
                ></textarea>
              </div>
              <button 
                type="button"
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
              >
                Send Message
              </button>
            </form>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-8 shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-amber-500">Connect With Us</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Follow us on social media for the latest updates, bourbon recommendations, and community events.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center">
                <span className="bg-amber-600/20 p-2 rounded-full mr-4">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </span>
                <span className="text-gray-300">bourbonbuddy@bitspec.co</span>
              </div>
              <div className="flex items-center">
                <span className="bg-amber-600/20 p-2 rounded-full mr-4">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                  </svg>
                </span>
                <span className="text-gray-300">(555) 123-4567</span>
              </div>
              
              <hr className="border-gray-700" />
              
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Office Hours</h3>
                <div className="space-y-2 text-gray-300">
                  <p>Monday - Friday: 9AM - 6PM EST</p>
                  <p>Saturday: 10AM - 4PM EST</p>
                  <p>Sunday: Closed</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mb-12 bg-gradient-to-r from-amber-900/20 to-gray-800/50 rounded-xl p-8 shadow-lg border border-amber-900/30">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to elevate your bourbon experience?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of bourbon enthusiasts who trust Bourbon Buddy to manage their collections.
          </p>
          <Link 
            href="/signup" 
            className="inline-flex items-center px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium text-lg"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>

        {/* Footer Info */}
        <div className="text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} Bourbon Buddy. All rights reserved.</p>
          <p className="mt-1">Images and content are for demonstration purposes only.</p>
        </div>
      </div>
    </div>
  )
}

const missionsPoints = [
  {
    icon: <GlencairnGlass className="w-6 h-6 text-amber-500" fillLevel={60} fillColor="#d97706" />,
    title: "Organization",
    description: "Seamlessly catalog and categorize your entire bourbon collection with precision and ease."
  },
  {
    icon: <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>,
    title: "Documentation",
    description: "Track tasting notes, bottle levels, and personal ratings with our intuitive interface."
  },
  {
    icon: <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
    </svg>,
    title: "Community",
    description: "Connect with fellow enthusiasts through live tastings and collaborative collections."
  }
]

const features = [
  {
    icon: <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
    </svg>,
    title: "Collection Management",
    description: "Catalog your bottles with details on distillery, proof, price, and more. Search, filter, and sort your collection with ease."
  },
  {
    icon: <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
    </svg>,
    title: "Tasting Notes",
    description: "Record detailed tasting experiences including nose, palate, finish, and overall impression. Add photos and track your preferences over time."
  },
  {
    icon: <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
    </svg>,
    title: "Live Tastings",
    description: "Host or join streaming tasting sessions with fellow enthusiasts. Share real-time reactions and discuss flavor profiles together."
  },
  {
    icon: <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
    </svg>,
    title: "Bottle Level Tracking",
    description: "Visually track how much bourbon remains in each bottle with our intuitive level indicators. Monitor consumption and value over time."
  },
  {
    icon: <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
    </svg>,
    title: "Collection Analytics",
    description: "Gain insights into your collection's value, diversity, and growth over time. Visualize your preferences with beautiful charts and graphs."
  },
  {
    icon: <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>,
    title: "Bourbon Discovery",
    description: "Explore new bottles based on your preferences and collection history. Receive personalized recommendations from our extensive database."
  }
]

const testimonials = [
  {
    initial: "R",
    name: "Robert K.",
    location: "Kentucky",
    quote: "Bourbon Buddy has completely transformed how I manage my collection. The bottle level tracking feature is genius, and connecting with other enthusiasts has introduced me to bottles I would have never discovered otherwise."
  },
  {
    initial: "M",
    name: "Michelle T.",
    location: "Tennessee",
    quote: "As a whiskey blogger, I need to keep detailed notes on everything I taste. Bourbon Buddy makes this process seamless and enjoyable. The tasting note templates are perfect for capturing every nuance."
  },
  {
    initial: "J",
    name: "James L.",
    location: "California",
    quote: "The live tasting feature is incredible! I've hosted virtual tastings with friends across the country, and it feels like we're all sitting around the same table. This app has brought us closer despite the distance."
  },
  {
    initial: "S",
    name: "Sarah M.",
    location: "New York",
    quote: "I was intimidated getting into bourbon collecting, but Bourbon Buddy made it accessible and fun. The community is welcoming, and the app has taught me so much about appreciating fine whiskey."
  }
] 