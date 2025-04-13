'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from './SupabaseProvider';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const { supabase } = useSupabase();
  
  // Memoize router refresh to avoid unnecessary re-renders
  const refreshWithDelay = useCallback(() => {
    // Use a small delay to let renders batch and avoid flickering
    setTimeout(() => router.refresh(), 100);
  }, [router]);
  
  // Listen for auth state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Only set up the listener once, not on every render
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Only refresh for significant auth state changes
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        console.log(`Auth state changed: ${event}`);
        refreshWithDelay();
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [supabase, refreshWithDelay]);

  // Avoid unnecessary renders - pure passthrough component
  return <>{children}</>;
} 