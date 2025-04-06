'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase';

export default function DashboardPage() {
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();
  const [supabaseSession, setSupabaseSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check for Supabase session
  useEffect(() => {
    const checkSupabaseSession = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        setSupabaseSession(data.session);
      } catch (error) {
        console.error('Error checking Supabase session:', error);
      } finally {
        setLoading(false);
      }
    };

    if (nextAuthStatus !== 'loading') {
      checkSupabaseSession();
    }
  }, [nextAuthStatus]);

  // Show loading state while checking auth
  if (nextAuthStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Redirect if no session
  if (!nextAuthSession && !supabaseSession) {
    redirect('/login');
    return null;
  }

  // Determine user info from either auth system
  const user = nextAuthSession?.user || supabaseSession?.user;
  const userName = user?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex flex-col min-h-[calc(100vh-12rem)] container mx-auto px-4 py-8 mt-6">
      <div className="max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-8 flex flex-wrap items-baseline">
          <span className="mr-2">Welcome back,</span> 
          <span className="truncate max-w-[60%]">{userName}!</span>
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Collection Card */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 shadow-xl border border-white/10 hover:border-white/20 transition-all duration-200">
            <h2 className="text-xl font-semibold mb-4">Your Collection</h2>
            <p className="text-gray-300 mb-4">Manage your bourbon collection and track your favorites.</p>
            <Link
              href="/collection"
              className="inline-block bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors duration-200 font-medium shadow-lg hover:shadow-amber-500/20"
            >
              View Collection
            </Link>
          </div>

          {/* Streams Card */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 shadow-xl border border-white/10 hover:border-white/20 transition-all duration-200">
            <h2 className="text-xl font-semibold mb-4">Live Tastings</h2>
            <p className="text-gray-300 mb-4">Join live tastings or start your own streaming session.</p>
            <Link
              href="/streams"
              className="inline-block bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors duration-200 font-medium shadow-lg hover:shadow-amber-500/20"
            >
              Browse Streams
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/streams/create"
              className="bg-white/5 backdrop-blur-sm rounded-lg p-4 shadow-xl border border-white/10 hover:border-white/20 transition-all duration-200 text-center"
            >
              <span className="block text-lg font-medium mb-2">Start a Tasting</span>
              <span className="text-sm text-gray-400">Share your collection live</span>
            </Link>
            <Link
              href="/collection"
              className="bg-white/5 backdrop-blur-sm rounded-lg p-4 shadow-xl border border-white/10 hover:border-white/20 transition-all duration-200 text-center"
            >
              <span className="block text-lg font-medium mb-2">Add Spirit</span>
              <span className="text-sm text-gray-400">Add a new bottle to your collection</span>
            </Link>
            <Link
              href="/profile"
              className="bg-white/5 backdrop-blur-sm rounded-lg p-4 shadow-xl border border-white/10 hover:border-white/20 transition-all duration-200 text-center"
            >
              <span className="block text-lg font-medium mb-2">Edit Profile</span>
              <span className="text-sm text-gray-400">Update your personal information</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 