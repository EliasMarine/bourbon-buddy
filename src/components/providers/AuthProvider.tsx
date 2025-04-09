'use client';

import React, { useEffect, useState } from 'react';
import { SessionProvider, signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSupabase } from './SupabaseProvider';

interface AuthProviderProps {
  children: React.ReactNode;
}

// Inner component to handle auth sync logic
function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session } = useSession();
  const supabase = useSupabase();
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastAuthSync, setLastAuthSync] = useState<Date | null>(null);

  // Initialize and configure auth sync on client side
  useEffect(() => {
    const syncId = Math.random().toString(36).substring(2, 8);
    
    const initAuth = async () => {
      try {
        console.log(`[${syncId}] 🔄 Initializing auth sync`);
        
        // Handle initial session
        const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error(`[${syncId}] ❌ Error fetching Supabase session:`, error);
        }
        
        // Log the current auth state for debugging
        console.log(`[${syncId}] 🔑 NextAuth session:`, session?.user?.email || 'no session');
        console.log(`[${syncId}] 🔐 Supabase session:`, supabaseSession?.user?.email || 'no session');
        
        // Sync Supabase with NextAuth
        if (supabaseSession && !session) {
          console.log(`[${syncId}] 🔄 Syncing Supabase session with NextAuth`);
          
          try {
            // Attempt to sign in with existing Supabase session
            const result = await signIn('credentials', { 
              redirect: false,
              email: supabaseSession.user.email,
              // This is just a signal to our auth API - actual auth is done with the Supabase session
              supabaseSession: 'true'
            });
            
            if (result?.error) {
              console.error(`[${syncId}] ❌ Error signing in with Supabase session:`, result.error);
            } else {
              console.log(`[${syncId}] ✅ Successfully synced Supabase session with NextAuth`);
              setLastAuthSync(new Date());
              
              // Refresh to update the UI with new auth state
              router.refresh();
            }
          } catch (signInError) {
            console.error(`[${syncId}] ❌ Error signing in with Supabase session:`, signInError);
          }
        } else if (session && !supabaseSession) {
          // The reverse case - if we have NextAuth session but no Supabase session
          console.log(`[${syncId}] ⚠️ Found NextAuth session but no Supabase session, sign-in flow may be needed`);
        } else if (session && supabaseSession) {
          console.log(`[${syncId}] ✅ Both NextAuth and Supabase sessions are present`);
          setLastAuthSync(new Date());
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error(`[${syncId}] ❌ Auth initialization error:`, error);
        setIsInitialized(true);
      }
    };
    
    initAuth();
    
    // Set up Supabase auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log(`[${syncId}] 🔔 Supabase auth event: ${event}`, currentSession?.user?.email || 'no session');
      
      // React to auth events
      if (event === 'SIGNED_IN') {
        // If Supabase session changes, sync with NextAuth
        if (!session && currentSession) {
          console.log(`[${syncId}] 🔄 Supabase SIGNED_IN event - syncing with NextAuth`);
          
          // Trigger NextAuth sign in with Supabase session
          signIn('credentials', {
            redirect: false,
            email: currentSession.user.email,
            supabaseSession: 'true'
          }).then(result => {
            if (result?.error) {
              console.error(`[${syncId}] ❌ Failed to sign in with NextAuth after Supabase SIGNED_IN:`, result.error);
            } else {
              console.log(`[${syncId}] ✅ Successfully signed in with NextAuth after Supabase SIGNED_IN`);
              setLastAuthSync(new Date());
              router.refresh();
            }
          });
        }
      } else if (event === 'SIGNED_OUT') {
        // If signed out of Supabase, also sign out of NextAuth
        console.log(`[${syncId}] 🔄 Supabase SIGNED_OUT event - refreshing page`);
        router.refresh();
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [router, session, supabase]);

  // Only render the children once auth is initialized to avoid flickering
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}

// Main Auth Provider
export default function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      <AuthSyncProvider>{children}</AuthSyncProvider>
    </SessionProvider>
  );
} 