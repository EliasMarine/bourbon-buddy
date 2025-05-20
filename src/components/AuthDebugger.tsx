'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Injects client-side debugging for authentication issues
 * Only active when DEBUG_AUTH is true or in development
 */
export default function AuthDebugger() {
  const pathname = usePathname();

  useEffect(() => {
    // Only run in development or when DEBUG_AUTH is true
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_DEBUG_AUTH) {
      return;
    }

    console.log(
      "%c🔍 Auth Debugger Active",
      "color: white; background-color: #4CAF50; padding: 4px 8px; border-radius: 4px; font-weight: bold;"
    );

    // Get authentication state from local storage or cookies
    const hasAuthCookie = document.cookie.includes('sb-');
    
    // Log the current state
    console.group("🔐 Auth Debug Info");
    console.log("📍 Path:", pathname);
    console.log("🍪 Auth Cookie Present:", hasAuthCookie);
    console.log("⏱️ Client Time:", new Date().toISOString());

    // Collection page specific checks
    if (pathname?.startsWith('/collection')) {
      console.log("%c⚠️ Collection Page Accessed", "color: orange; font-weight: bold");
      console.log("👉 Referer:", document.referrer || "Direct navigation");
      
      // Check localStorage for any auth data
      try {
        const localStorageKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('auth') || key.includes('session')
        );
        console.log("🗄️ Auth-related localStorage keys:", localStorageKeys);
      } catch (e) {
        console.log("🗄️ Cannot access localStorage:", e);
      }
      
      // List all cookies (names only for security)
      console.log("🍪 All Cookies:", document.cookie.split(';').map(c => c.trim().split('=')[0]));
    }
    
    console.groupEnd();
    
    // Log navigation events
    const logNavigationEvent = () => {
      console.log(
        "%c🧭 Navigation Event",
        "color: white; background-color: #2196F3; padding: 4px 8px; border-radius: 4px; font-weight: bold;",
        pathname
      );
    };
    
    // Log initial navigation
    logNavigationEvent();
    
    // Set up history change listener
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
      originalPushState.apply(this, arguments as any);
      logNavigationEvent();
    };
    
    history.replaceState = function() {
      originalReplaceState.apply(this, arguments as any);
      logNavigationEvent();
    };
    
    window.addEventListener('popstate', logNavigationEvent);
    
    return () => {
      // Cleanup
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', logNavigationEvent);
    };
  }, [pathname]);

  return null; // This component doesn't render anything
} 