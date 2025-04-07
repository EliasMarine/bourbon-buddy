"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function HeroSection() {
  // Background images array with all available images from the directory
  const backgroundImages = [
    '/images/backgrounds/Homepage_background/bourbon_bg-optimized.png',
    '/images/backgrounds/Homepage_background/geon-george-WKw5sOVf8XI-unsplash-optimized.jpg',
    '/images/backgrounds/Homepage_background/getty-images-ZUxHYKX6ML8-unsplash-optimized.jpg',
    '/images/backgrounds/Homepage_background/jon-tyson-nHBZT4Qi44Y-unsplash-optimized.jpg',
    '/images/backgrounds/Homepage_background/vianney-cahen-MJYYiC228mY-unsplash.jpg',
    '/images/backgrounds/Homepage_background/zhijian-dai-35R2-iOTmks-unsplash.jpg',
  ];
  
  const fallbackImage = '/images/bourbon-hero.jpg';
  
  // State for control
  const [activeSlide, setActiveSlide] = useState(0);
  const [visibleSlide, setVisibleSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Refs for timer management
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoplayRef = useRef<boolean>(true);
  
  // Preload images
  useEffect(() => {
    backgroundImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);
  
  // Clear all timers
  const clearAllTimers = () => {
    if (slideTimerRef.current) {
      clearTimeout(slideTimerRef.current);
      slideTimerRef.current = null;
    }
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  };
  
  // Function to move to a specific slide
  const goToSlide = (slideIndex: number) => {
    if (isTransitioning || slideIndex === visibleSlide) return;
    
    // Clear any existing timers
    clearAllTimers();
    
    // Set the slide we want to transition to
    setActiveSlide(slideIndex);
    
    // Start the transition
    setIsTransitioning(true);
    
    // After 2 seconds (transition duration), complete the slide change
    transitionTimerRef.current = setTimeout(() => {
      // Update the visible slide to match the active slide WITHOUT triggering additional transitions
      setVisibleSlide(slideIndex);
      
      // Delay resetting transition state slightly to avoid flicker
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
      
      // If autoplay is active, set up the next slide
      if (autoplayRef.current) {
        // Wait 14 seconds before moving to next slide
        slideTimerRef.current = setTimeout(() => {
          // Calculate next slide index
          const nextSlide = (slideIndex + 1) % backgroundImages.length;
          goToSlide(nextSlide);
        }, 14000);
      }
    }, 2000);
  };
  
  // Initialize slideshow
  useEffect(() => {
    autoplayRef.current = true;
    
    // Start first transition after 14 seconds
    slideTimerRef.current = setTimeout(() => {
      goToSlide(1); // Go to second slide
    }, 14000);
    
    // Cleanup on unmount
    return () => {
      autoplayRef.current = false;
      clearAllTimers();
    };
  }, []);
  
  // Handle manual navigation
  const handleSlideChange = (index: number) => {
    if (index === visibleSlide || isTransitioning) return;
    
    // Pause autoplay temporarily
    autoplayRef.current = false;
    
    // Go to selected slide
    goToSlide(index);
    
    // Resume autoplay after transition
    setTimeout(() => {
      autoplayRef.current = true;
    }, 2000);
  };
  
  // Handle image error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Failed to load image, using fallback');
    e.currentTarget.src = fallbackImage;
  };

  return (
    <section className="relative min-h-[100vh] flex items-center">
      {/* Background with overlay */}
      <div className="absolute inset-0 bg-black/30 z-10"></div>
      
      {/* Background images container */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Both slides are always rendered, but with different opacity based on transition state */}
        
        {/* Current/Visible Slide */}
        <div className="absolute inset-0 w-full h-full">
          <img 
            src={backgroundImages[visibleSlide]}
            alt={`Background image ${visibleSlide + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transition: isTransitioning ? 'opacity 2s ease-in-out' : 'none',
              zIndex: 1
            }}
            onError={handleImageError}
          />
        </div>
        
        {/* Next/Active Slide */}
        <div className="absolute inset-0 w-full h-full">
          <img 
            src={backgroundImages[activeSlide]}
            alt={`Background image ${activeSlide + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: isTransitioning ? 1 : 0,
              transition: isTransitioning ? 'opacity 2s ease-in-out' : 'none',
              zIndex: 0
            }}
            onError={handleImageError}
          />
        </div>
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
      
      {/* Image slider indicators */}
      <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
        {backgroundImages.map((_, index) => (
          <button 
            key={index}
            onClick={() => handleSlideChange(index)}
            className={`w-2 h-2 rounded-full ${
              visibleSlide === index ? 'bg-amber-500' : 'bg-white/40'
            } transition-all duration-300`}
            aria-label={`Show background image ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
} 