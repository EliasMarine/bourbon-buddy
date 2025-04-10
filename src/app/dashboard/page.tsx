'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { redirect, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { 
  PlusCircle, 
  Droplets, 
  Tv, 
  User, 
  GlassWater, 
  Heart, 
  Trophy, 
  Compass,
  Calendar,
  MessageCircle
} from 'lucide-react';
import Button from '@/components/ui/Button';

// Debug helper
const generateDebugId = () => Math.random().toString(36).substring(2, 8);
const DEBUG_ID = generateDebugId();

console.log(`[${DEBUG_ID}] 🚀 Dashboard page component initialized`);

export default function DashboardPage() {
  console.log(`[${DEBUG_ID}] 🔄 Dashboard page rendering`);
  
  const { data: session, status } = useSupabaseSession();
  const [loading, setLoading] = useState(true);
  const [collectionStats, setCollectionStats] = useState({
    totalSpirits: 0,
    favorites: 0,
    tastings: 0
  });
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const statsLoadedRef = useRef(false);
  const fetchingRef = useRef(false);

  console.log(`[${DEBUG_ID}] 🔐 Auth status: ${status}`);
  console.log(`[${DEBUG_ID}] 👤 Session:`, session ? "Present" : "Not present");

  // Fetch collection stats
  useEffect(() => {
    console.log(`[${DEBUG_ID}] 📊 Collection stats effect triggered`);
    console.log(`[${DEBUG_ID}] 📋 Effect state:`, { 
      loading, 
      hasSession: !!session
    });
    
    const fetchStats = async () => {
      // Prevent concurrent fetches
      if (fetchingRef.current) {
        console.log(`[${DEBUG_ID}] ⏸️ Fetch already in progress, skipping`);
        return;
      }
      
      if (!session) {
        console.log(`[${DEBUG_ID}] ⚠️ No session found, skipping stats fetch`);
        return;
      }
      
      // Skip if already loaded and same session to prevent loops
      if (statsLoadedRef.current && !loading) {
        console.log(`[${DEBUG_ID}] ✅ Stats already loaded, skipping fetch`);
        return;
      }
      
      try {
        fetchingRef.current = true;
        console.log(`[${DEBUG_ID}] 🌐 Fetching collection stats from API`);
        const startTime = Date.now();
        const response = await fetch('/api/collection/stats');
        console.log(`[${DEBUG_ID}] ⏱️ Stats API call took ${Date.now() - startTime}ms`);
        console.log(`[${DEBUG_ID}] 🔍 API response status:`, response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[${DEBUG_ID}] ✅ Stats data received:`, data);
          setCollectionStats({
            totalSpirits: data.totalSpirits || 0,
            favorites: data.favorites || 0,
            tastings: data.tastings || 0
          });
          statsLoadedRef.current = true;
        } else {
          console.warn(`[${DEBUG_ID}] ⚠️ Failed to fetch stats with status ${response.status}, using default values`);
          
          // Try to get response body for more debug info
          try {
            const errorBody = await response.text();
            console.error(`[${DEBUG_ID}] 🚨 Error response body:`, errorBody);
          } catch (e) {
            console.error(`[${DEBUG_ID}] 🚨 Could not read error response body`);
          }
          
          setError(`API error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error(`[${DEBUG_ID}] ❌ Error fetching collection stats:`, error);
        setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    if (status !== 'loading') {
      console.log(`[${DEBUG_ID}] 🚀 Authentication status resolved, fetching stats`);
      // Use setTimeout to debounce rapid consecutive calls
      const timeoutId = setTimeout(() => {
        fetchStats();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [status, loading]); // Add loading to the dependencies since we use it in the effect

  // Show loading state while checking auth
  if (status === 'loading' || loading) {
    console.log(`[${DEBUG_ID}] ⏳ Showing loading state`);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Show error state if needed
  if (error) {
    console.log(`[${DEBUG_ID}] ❌ Showing error state:`, error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-w-lg w-full">
          <h2 className="text-red-800 text-lg font-semibold mb-2">Authentication Error</h2>
          <p className="text-red-700">{error}</p>
          <div className="mt-4">
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Redirect if no session
  if (!session) {
    console.log(`[${DEBUG_ID}] 🔄 No session found, redirecting to login`);
    redirect('/login');
    return null;
  }

  // Determine user info from session
  const user = session?.user;
  const userName = user?.name || user?.email?.split('@')[0] || 'User';
  console.log(`[${DEBUG_ID}] 👤 Rendering for user: ${userName}`);

  console.log(`[${DEBUG_ID}] ✅ Dashboard page fully rendered`);
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background image with overlay */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent z-10"></div>
        <Image 
          src="/images/backgrounds/Collection background/collection_background.jpg?v=1"
          alt="Dashboard background"
          fill
          priority
          className="object-cover"
          unoptimized
          onError={(e) => {
            // If background fails to load, add a dark background color
            console.log(`[${DEBUG_ID}] ⚠️ Background image failed to load`);
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = 'none';
            if (target.parentElement) {
              target.parentElement.style.backgroundColor = '#111827'; // gray-900
            }
          }}
        />
      </div>
      
      {/* Debug info in development only */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="fixed top-0 right-0 bg-gray-800 text-white p-2 text-xs z-50 opacity-70 hover:opacity-100">
          <div>Debug ID: {DEBUG_ID}</div>
          <div>Auth: {session ? 'Supabase' : 'None'}</div>
        </div>
      )}
      
      {/* Noise texture overlay */}
      <div className="fixed inset-0 opacity-20 mix-blend-overlay pointer-events-none z-10" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}
      ></div>
      
      {/* Decorative bourbon glass top-right */}
      <div className="absolute top-24 -right-20 w-64 h-64 rounded-full bg-amber-600/20 blur-3xl z-0"></div>
      <div className="absolute bottom-20 -left-20 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl z-0"></div>
      
      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 py-12 pt-28">
        {/* Header Section with Welcome */}
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-amber-600 to-amber-500 p-0.5 rounded-2xl mb-8 shadow-xl">
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">
                    Welcome back, <span className="text-amber-500">{userName}</span>
                  </h1>
                  <p className="text-gray-300 max-w-xl">
                    Track your bourbon collection, join live tastings, and connect with other enthusiasts.
                  </p>
                  
                  <div className="mt-4 flex flex-wrap gap-4">
                    <Button 
                      variant="primary" 
                      onClick={() => router.push('/collection?add=true')}
                      className="group"
                    >
                      <PlusCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                      Add Spirit
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => router.push('/streams/create')}
                    >
                      <Tv className="mr-2 h-5 w-5" />
                      Start Tasting
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 bg-gray-800/50 backdrop-blur-sm p-3 rounded-xl border border-gray-700/50 self-stretch md:self-end">
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-800/50">
                    <GlassWater className="h-7 w-7 text-amber-500 mb-1" />
                    <p className="text-2xl font-bold text-white">{collectionStats.totalSpirits}</p>
                    <p className="text-xs text-gray-400">Spirits</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-800/50">
                    <Heart className="h-7 w-7 text-amber-500 mb-1" />
                    <p className="text-2xl font-bold text-white">{collectionStats.favorites}</p>
                    <p className="text-xs text-gray-400">Favorites</p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-800/50">
                    <Calendar className="h-7 w-7 text-amber-500 mb-1" />
                    <p className="text-2xl font-bold text-white">{collectionStats.tastings}</p>
                    <p className="text-xs text-gray-400">Tastings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Dashboard Cards Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Collection Card */}
            <div className="col-span-1 md:col-span-2 bg-white/5 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/10 hover:border-amber-500/20 transition-all duration-300 group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold mb-1 text-white group-hover:text-amber-500 transition-colors">Your Collection</h2>
                  <p className="text-gray-400">Manage your spirits and tasting notes</p>
                </div>
                <div className="bg-amber-500/10 p-2 rounded-lg">
                  <Droplets className="h-6 w-6 text-amber-500" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Link href="/collection" className="flex flex-col space-y-2 p-3 rounded-lg bg-gray-800/50 backdrop-blur-sm hover:bg-gray-800 transition-colors border border-gray-700/50">
                  <span className="text-white font-medium">View All</span>
                  <span className="text-sm text-gray-400">Browse your complete collection</span>
                </Link>
                <Link href="/collection?sort=recent" className="flex flex-col space-y-2 p-3 rounded-lg bg-gray-800/50 backdrop-blur-sm hover:bg-gray-800 transition-colors border border-gray-700/50">
                  <span className="text-white font-medium">Recent Additions</span>
                  <span className="text-sm text-gray-400">See your latest spirits</span>
                </Link>
                <Link href="/collection?view=favorites" className="flex flex-col space-y-2 p-3 rounded-lg bg-gray-800/50 backdrop-blur-sm hover:bg-gray-800 transition-colors border border-gray-700/50">
                  <span className="text-white font-medium">Favorites</span>
                  <span className="text-sm text-gray-400">Your top-rated spirits</span>
                </Link>
                <Link href="/collection?add=true" className="flex flex-col space-y-2 p-3 rounded-lg bg-gray-800/50 backdrop-blur-sm hover:bg-gray-800 transition-colors border border-gray-700/50">
                  <span className="text-white font-medium">Add New</span>
                  <span className="text-sm text-gray-400">Expand your collection</span>
                </Link>
              </div>
            </div>
            
            {/* Live Tastings Card */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/10 hover:border-amber-500/20 transition-all duration-300 group flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold mb-1 text-white group-hover:text-amber-500 transition-colors">Live Tastings</h2>
                  <p className="text-gray-400">Join or host live sessions</p>
                </div>
                <div className="bg-amber-500/10 p-2 rounded-lg">
                  <Tv className="h-6 w-6 text-amber-500" />
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-3 mt-4">
                  <Link href="/streams" className="w-full flex items-center space-x-2 p-3 rounded-lg bg-gray-800/50 backdrop-blur-sm hover:bg-gray-800 transition-colors border border-gray-700/50">
                    <Compass className="h-5 w-5 text-amber-500" />
                    <span className="text-white">Browse Streams</span>
                  </Link>
                  <Link href="/streams/create" className="w-full flex items-center space-x-2 p-3 rounded-lg bg-gray-800/50 backdrop-blur-sm hover:bg-gray-800 transition-colors border border-gray-700/50">
                    <PlusCircle className="h-5 w-5 text-amber-500" />
                    <span className="text-white">Create Stream</span>
                  </Link>
                </div>
                
                <div className="mt-auto pt-6">
                  <Link 
                    href="/streams"
                    className="inline-block bg-amber-600/20 text-amber-500 hover:bg-amber-600/30 font-medium px-4 py-2 rounded-lg w-full text-center transition-colors"
                  >
                    View All Tastings
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Links Section */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-white">Quick Links</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/profile" className="flex items-center justify-center flex-col p-4 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-200 border border-white/10 hover:border-amber-500/20 group">
                <User className="h-6 w-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-white font-medium">Profile</span>
                <span className="text-xs text-gray-400">Edit your details</span>
              </Link>
              <Link href="/explore" className="flex items-center justify-center flex-col p-4 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-200 border border-white/10 hover:border-amber-500/20 group">
                <Compass className="h-6 w-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-white font-medium">Explore</span>
                <span className="text-xs text-gray-400">Discover spirits</span>
              </Link>
              <Link href="/pricing" className="flex items-center justify-center flex-col p-4 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-200 border border-white/10 hover:border-amber-500/20 group">
                <Trophy className="h-6 w-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-white font-medium">Upgrade</span>
                <span className="text-xs text-gray-400">Premium features</span>
              </Link>
              <Link href="/faq" className="flex items-center justify-center flex-col p-4 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-200 border border-white/10 hover:border-amber-500/20 group">
                <MessageCircle className="h-6 w-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-white font-medium">Support</span>
                <span className="text-xs text-gray-400">Get help</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 