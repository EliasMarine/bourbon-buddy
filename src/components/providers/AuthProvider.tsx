'use client';

import React, { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  // Initialize and configure Supabase auth on client side
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    
    // Handle initial session
    const checkSupabaseSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('Supabase session detected:', session.user.id);
      }
    };

    checkSupabaseSession();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Supabase auth event:', event, session?.user?.id || 'no session');
      
      // Handle auth state changes
      if (event === 'SIGNED_IN') {
        // Refresh the page to ensure app is in sync with auth state
        router.refresh();
      } else if (event === 'SIGNED_OUT') {
        // Redirect to login or refresh
        router.refresh();
      }
    });

    return () => {
      // Clean up listener
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [router]);

  return <SessionProvider>{children}</SessionProvider>;
} 