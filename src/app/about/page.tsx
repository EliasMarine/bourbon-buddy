import React from 'react';
import Image from 'next/image';
import GlencairnGlass from '@/components/ui/icons/GlencairnGlass';

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-amber-600/20 rounded-full mb-4">
            <GlencairnGlass className="w-10 h-10 text-amber-500" fillLevel={75} fillColor="#d97706" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About Bourbon Buddy</h1>
          <p className="text-xl text-gray-300">Your personal bourbon collection manager and tasting companion</p>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 mb-10 shadow-lg border border-gray-700">
          <h2 className="text-2xl font-bold mb-4 text-amber-500">Our Mission</h2>
          <p className="text-gray-300 mb-6 leading-relaxed">
            Bourbon Buddy was created with a simple mission: to help whiskey enthusiasts track, organize, and share their collections. 
            Whether you're just starting your bourbon journey or you're a seasoned collector, our platform provides the tools you need 
            to catalog your bottles, record tasting notes, and connect with other enthusiasts through live tastings.
          </p>
          <div className="relative h-64 md:h-96 rounded-lg overflow-hidden mb-6">
            <Image 
              src="/images/bourbon-hero.jpg" 
              alt="Bourbon collection" 
              fill
              className="object-cover"
            />
          </div>
          <p className="text-gray-300 leading-relaxed">
            We believe that enjoying whiskey is not just about the drink itself, but about the experience, the stories, and the 
            community that comes with it. That's why we've built features that enable you to connect with other bourbon lovers 
            through live streaming tastings, sharing your collection, and discovering new bottles.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gray-800/50 rounded-xl p-6 shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-amber-500">Features</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start">
                <span className="bg-amber-600/20 p-1 rounded-full mr-3 mt-1">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </span>
                <span>Collection Tracking: Catalog your bottles with details on proof, price, and more</span>
              </li>
              <li className="flex items-start">
                <span className="bg-amber-600/20 p-1 rounded-full mr-3 mt-1">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </span>
                <span>Tasting Notes: Record your experience with nose, palate, and finish notes</span>
              </li>
              <li className="flex items-start">
                <span className="bg-amber-600/20 p-1 rounded-full mr-3 mt-1">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </span>
                <span>Live Tastings: Host or join streaming sessions with other enthusiasts</span>
              </li>
              <li className="flex items-start">
                <span className="bg-amber-600/20 p-1 rounded-full mr-3 mt-1">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </span>
                <span>Bottle Level Tracking: Visually track how much is left in each bottle</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-amber-500">Contact Us</h2>
            <p className="text-gray-300 mb-4">
              We're always looking to improve Bourbon Buddy. If you have any suggestions, questions, or just want to chat about whiskey, feel free to reach out!
            </p>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="bg-amber-600/20 p-2 rounded-full mr-3">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </span>
                <span className="text-gray-300">support@bourbonbuddy.com</span>
              </div>
              <div className="flex items-center">
                <span className="bg-amber-600/20 p-2 rounded-full mr-3">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                  </svg>
                </span>
                <span className="text-gray-300">(555) 123-4567</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-gray-400 text-sm">
          <p>© 2025 Bourbon Buddy. All rights reserved.</p>
          <p className="mt-1">Images and content are for demonstration purposes only.</p>
        </div>
      </div>
    </div>
  );
} 