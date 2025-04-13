'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabase } from '@/components/providers/SupabaseProvider';

// Global session state to track processed users
const processedUsers = new Set<string>();

export default function VerifyRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, userSynced, isSyncing, refreshSession, supabase } = useSupabase();
  
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const timestamp = searchParams.get('t'); // Get the timestamp to avoid cache issues
  
  // Force a direct API check on load
  useEffect(() => {
    async function checkStatusDirectly() {
      if (!user) return;
      
      // Don't repeat for the same user
      if (processedUsers.has(user.id)) {
        console.log('Already processed this user, waiting for redirect');
        return;
      }
      
      try {
        // Force a session refresh first
        await refreshSession();
        
        // Get fresh user data directly from Supabase
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error getting fresh user data:', error);
          return;
        }
        
        const freshUser = data.user;
        console.log('Fresh user data from API:', {
          id: freshUser.id,
          isRegistered: freshUser.app_metadata?.is_registered,
          lastSynced: freshUser.app_metadata?.last_synced_at,
        });
        
        // If user is already registered according to fresh data, redirect
        if (freshUser?.app_metadata?.is_registered === true) {
          console.log('User already registered according to fresh API data');
          processedUsers.add(user.id);
          router.push(callbackUrl);
          return;
        }
        
        // Check with API
        const checkResponse = await fetch(`/api/auth/check-status?t=${Date.now()}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        
        if (checkResponse.ok) {
          const data = await checkResponse.json();
          if (data.isRegistered) {
            console.log('User already registered according to API check');
            processedUsers.add(user.id);
            router.push(callbackUrl);
            return;
          }
        }
      } catch (err) {
        console.error('Error checking user status directly:', err);
      }
    }
    
    if (!isLoading && user) {
      checkStatusDirectly();
    }
  }, [user, isLoading, callbackUrl, router, refreshSession, supabase]);
  
  // Main logic for handling the sync status
  useEffect(() => {
    // Wait for auth state to stabilize
    if (isLoading) return;
    
    // Handle user not logged in
    if (!user) {
      console.log('No user found, redirecting to login');
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    
    // Check if user is already synced via SupabaseProvider
    if (userSynced) {
      console.log('User already synced, redirecting to:', callbackUrl);
      processedUsers.add(user.id);
      router.push(callbackUrl);
      return;
    }
    
    // If not synced and not already syncing, trigger a sync
    if (!isSyncing && !userSynced && !processedUsers.has(user.id)) {
      console.log('Triggering sync for user');
      const triggerSync = async () => {
        // Add timestamp to prevent caching
        const syncTimestamp = Date.now();
        const response = await fetch(`/api/auth/sync-user?t=${syncTimestamp}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
          },
          cache: 'no-store',
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Sync successful:', data);
          
          // Mark user as processed to prevent duplicate syncs
          processedUsers.add(user.id);
          
          // Force refresh session and redirect
          await refreshSession();
          router.push(callbackUrl);
        } else {
          console.error('Sync failed:', await response.text());
        }
      };
      
      triggerSync();
    }
  }, [user, isLoading, userSynced, isSyncing, callbackUrl, router, refreshSession]);
  
  // During Fast Refresh development, add logging to help debug
  useEffect(() => {
    console.log('[VerifyRegistrationPage] Render state:', {
      isLoading,
      userSynced,
      isSyncing,
      hasUser: !!user,
      userId: user?.id,
      timestamp,
      processed: user ? processedUsers.has(user.id) : false
    });
  }, [isLoading, userSynced, isSyncing, user, timestamp]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Verifying Registration</h1>
        <p className="mb-6 text-gray-300">
          {isSyncing 
            ? "We're syncing your account information..." 
            : "Checking your account status..."}
        </p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
        </div>
        
        <div className="mt-6">
          <button
            onClick={() => router.push(callbackUrl)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
          >
            Continue to {callbackUrl.startsWith('/dashboard') ? 'Dashboard' : 'Application'}
          </button>
        </div>
      </div>
    </div>
  );
} 