import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Star, Database, Tv, Globe, ArrowUpRight, Wine, GlassWater, Glasses } from 'lucide-react';
import HeroSection from '@/components/home/HeroSection';

export default function Home() {
  return (
    <>
      {/* Hero Section with client-side component for image handling */}
      <HeroSection />

      {/* Features Section - With Apple-inspired clean cards and microinteractions */}
      <section className="py-28 bg-gray-900">
        <div className="container mx-auto px-6 md:px-8">
          <div className="text-center mb-20">
            <span className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-3 block">Features</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-5">Everything You Need</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto font-light">
              Bourbon Buddy helps you track your collection, record tasting notes, and connect with other enthusiasts.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-3xl bg-gray-800/30 backdrop-blur-md border border-white/5 hover:border-amber-500/20 transition-all duration-300 hover:translate-y-[-8px] hover:shadow-xl hover:shadow-amber-500/5">
              <div className="bg-amber-600/10 p-4 rounded-2xl w-fit mb-6 group-hover:bg-amber-600/20 transition-all duration-300">
                <Database className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-amber-500 transition-colors">Collection Tracking</h3>
              <p className="text-gray-300 leading-relaxed">
                Catalog your bottles with detailed information including price, proof, and purchase location.
              </p>
              <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Link href="/collection" className="text-amber-500 flex items-center text-sm font-medium hover:text-amber-400">
                  Learn more <ArrowUpRight className="ml-1 w-4 h-4" />
                </Link>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="group p-8 rounded-3xl bg-gray-800/30 backdrop-blur-md border border-white/5 hover:border-amber-500/20 transition-all duration-300 hover:translate-y-[-8px] hover:shadow-xl hover:shadow-amber-500/5">
              <div className="bg-amber-600/10 p-4 rounded-2xl w-fit mb-6 group-hover:bg-amber-600/20 transition-all duration-300">
                <Star className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-amber-500 transition-colors">Tasting Notes</h3>
              <p className="text-gray-300 leading-relaxed">
                Record your tasting experience with detailed nose, palate, and finish notes to remember your favorites.
              </p>
              <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Link href="/collection" className="text-amber-500 flex items-center text-sm font-medium hover:text-amber-400">
                  Learn more <ArrowUpRight className="ml-1 w-4 h-4" />
                </Link>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="group p-8 rounded-3xl bg-gray-800/30 backdrop-blur-md border border-white/5 hover:border-amber-500/20 transition-all duration-300 hover:translate-y-[-8px] hover:shadow-xl hover:shadow-amber-500/5">
              <div className="bg-amber-600/10 p-4 rounded-2xl w-fit mb-6 group-hover:bg-amber-600/20 transition-all duration-300">
                <Tv className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-amber-500 transition-colors">Live Tastings</h3>
              <p className="text-gray-300 leading-relaxed">
                Join or host live tasting sessions with other bourbon enthusiasts from around the world.
              </p>
              <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Link href="/streams" className="text-amber-500 flex items-center text-sm font-medium hover:text-amber-400">
                  Learn more <ArrowUpRight className="ml-1 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Community Section - Whiskey Showcase */}
      <section className="py-20 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="container mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <span className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-3 block">Community</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-5">Join Whiskey Enthusiasts</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto font-light">
              Connect with collectors and enthusiasts worldwide.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="relative h-80 rounded-2xl overflow-hidden group bg-gray-800/40 backdrop-blur-sm border border-white/5 hover:border-amber-500/20 transition-all duration-300">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Wine className="w-24 h-24 text-amber-500 mb-4" />
                <p className="text-white text-2xl font-medium">Premium Bourbons</p>
                <p className="text-gray-400 mt-2">Discover rare and unique bottles</p>
              </div>
            </div>
            <div className="relative h-80 rounded-2xl overflow-hidden group bg-gray-800/40 backdrop-blur-sm border border-white/5 hover:border-amber-500/20 transition-all duration-300">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <GlassWater className="w-24 h-24 text-amber-500 mb-4" />
                <p className="text-white text-2xl font-medium">Rye Whiskeys</p>
                <p className="text-gray-400 mt-2">Explore bold and spicy spirits</p>
              </div>
            </div>
            <div className="relative h-80 rounded-2xl overflow-hidden group bg-gray-800/40 backdrop-blur-sm border border-white/5 hover:border-amber-500/20 transition-all duration-300">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Glasses className="w-24 h-24 text-amber-500 mb-4" />
                <p className="text-white text-2xl font-medium">Scotch Whiskies</p>
                <p className="text-gray-400 mt-2">Experience traditional craftsmanship</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Apple-style gradient and simplicity */}
      <section className="py-24 bg-gradient-to-r from-amber-800 to-amber-600">
        <div className="container mx-auto px-6 md:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">Ready to Start Your Collection?</h2>
          <p className="text-xl mb-10 text-amber-100 max-w-2xl mx-auto font-light">
            Join thousands of whiskey enthusiasts who track and share their collections with Bourbon Buddy.
          </p>
          <Link
            href="/signup"
            className="bg-white hover:bg-gray-100 text-amber-800 px-10 py-5 rounded-full transition-colors duration-300 font-medium text-lg inline-block shadow-xl"
          >
            Create Your Account
          </Link>
        </div>
      </section>

      {/* Testimonials Section - Apple-style clean cards */}
      <section className="py-28 bg-gray-900">
        <div className="container mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <span className="text-amber-500 text-sm font-medium tracking-widest uppercase mb-3 block">Testimonials</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-5">What Our Users Say</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto font-light">
              Hear from bourbon enthusiasts who use Bourbon Buddy to manage their collections.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Testimonial 1 */}
            <div className="p-8 rounded-3xl bg-gray-800/40 backdrop-blur-md border border-white/5 hover:border-white/10 transition-all duration-300">
              <div className="flex items-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-5 h-5 fill-amber-500 text-amber-500" />
                ))}
              </div>
              <p className="text-gray-300 mb-8 leading-relaxed">
                "Bourbon Buddy has transformed how I track my collection. The tasting notes feature is especially helpful for remembering my favorites."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-600/20 rounded-full flex items-center justify-center">
                  <span className="text-amber-500 font-bold">JB</span>
                </div>
                <div>
                  <h4 className="font-medium">James Brown</h4>
                  <p className="text-gray-400 text-sm">Whiskey Collector</p>
                </div>
              </div>
            </div>
            
            {/* Testimonial 2 */}
            <div className="p-8 rounded-3xl bg-gray-800/40 backdrop-blur-md border border-white/5 hover:border-white/10 transition-all duration-300">
              <div className="flex items-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-5 h-5 fill-amber-500 text-amber-500" />
                ))}
              </div>
              <p className="text-gray-300 mb-8 leading-relaxed">
                "I love being able to share my collection with friends and participate in virtual tastings. The interface is beautifully designed and intuitive."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-600/20 rounded-full flex items-center justify-center">
                  <span className="text-amber-500 font-bold">SM</span>
                </div>
                <div>
                  <h4 className="font-medium">Sarah Miller</h4>
                  <p className="text-gray-400 text-sm">Bourbon Enthusiast</p>
                </div>
              </div>
            </div>
            
            {/* Testimonial 3 */}
            <div className="p-8 rounded-3xl bg-gray-800/40 backdrop-blur-md border border-white/5 hover:border-white/10 transition-all duration-300">
              <div className="flex items-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-5 h-5 fill-amber-500 text-amber-500" />
                ))}
              </div>
              <p className="text-gray-300 mb-8 leading-relaxed">
                "As a whiskey bar owner, Bourbon Buddy helps me keep track of my inventory and discover new bottles based on customer preferences."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-600/20 rounded-full flex items-center justify-center">
                  <span className="text-amber-500 font-bold">DT</span>
                </div>
                <div>
                  <h4 className="font-medium">David Thompson</h4>
                  <p className="text-gray-400 text-sm">Bar Owner</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
} 