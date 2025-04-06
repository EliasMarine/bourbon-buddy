"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function HeroSection() {
  // State to track if image loaded successfully
  const [imageLoaded, setImageLoaded] = useState(true);
  
  // Create a cache buster for the image URL
  const [cacheBuster] = useState(() => Date.now());
  
  // Image paths
  const primaryImage = `/images/backgrounds/bourbon_bg.png?v=${cacheBuster}`;
  const fallbackImage = '/images/bourbon-hero.jpg';
  
  // Current image being displayed
  const [currentImage, setCurrentImage] = useState(primaryImage);

  // Handle image error
  const handleImageError = () => {
    console.error('Failed to load primary image, using fallback');
    setImageLoaded(false);
    setCurrentImage(fallbackImage);
  };

  return (
    <section className="relative min-h-[100vh] flex items-center">
      {/* Background with overlay */}
      <div className="absolute inset-0 bg-black/30 z-10"></div>
      <div className="absolute inset-0 overflow-hidden">
        <img 
          src={currentImage}
          alt="Bourbon barrels" 
          className="w-full h-full object-cover"
          style={{ position: 'absolute' }}
          onError={handleImageError}
        />
      </div>
      
      {/* Hero Content - Apple-inspired centered and minimal */}
      <div className="container relative mx-auto px-6 md:px-8 z-30 flex flex-col items-center text-center h-full pt-32 md:pt-0">
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-white leading-tight tracking-tight">
          Track Your <span className="text-amber-500">Whiskey</span><br />Journey
        </h1>
        <p className="text-xl md:text-2xl mb-10 text-gray-200 max-w-2xl font-light">
          Discover, catalog, and share your bourbon collection with elegance.
        </p>
        <div className="flex flex-col sm:flex-row gap-5">
          <Link
            href="/collection"
            className="bg-amber-600 text-white px-8 py-4 rounded-full hover:bg-amber-700 transition-all duration-300 font-medium shadow-lg text-lg flex items-center justify-center gap-2 group"
          >
            Start Your Collection
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/streams"
            className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-8 py-4 rounded-full transition-all duration-300 font-medium text-lg flex items-center justify-center"
          >
            Explore Tastings
          </Link>
        </div>
      </div>

      {/* Apple-style scroll indicator */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
        <div className="w-8 h-14 border-2 border-white/50 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-white/70 rounded-full animate-pulse"></div>
        </div>
      </div>
    </section>
  );
} 