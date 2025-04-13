'use client';

import React, { useState, useEffect } from 'react';
import { useSessionContext } from '@/components/providers/SupabaseProvider';

// LoadingOverlay component with bourbon-themed loading animation
function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-t-amber-500 border-r-amber-500 border-b-amber-200 border-l-amber-200 animate-spin"></div>
        <p className="text-amber-500 text-lg font-medium">Loading...</p>
      </div>
    </div>
  );
}

interface AuthLoadingGuardProps {
  children: React.ReactNode;
  /** Minimum loading time in ms to prevent flickering */
  minLoadingTime?: number;
  /** Show loading overlay only for initial load or also for subsequent status changes */
  onlyInitialLoad?: boolean;
}

/**
 * AuthLoadingGuard - Prevents UI flickering during authentication state changes
 * This component should be used inside pages that require authentication or
 * in layouts where authentication state is important for the UI.
 */
export default function AuthLoadingGuard({ 
  children, 
  minLoadingTime = 600,
  onlyInitialLoad = true
}: AuthLoadingGuardProps) {
  // Always fetch the context - if there's an error, we'll render children anyway
  let isLoading: boolean = true;
  let status: string = 'loading';
  
  // Safely access session context if available
  try {
    const context = useSessionContext();
    isLoading = context.isLoading;
    status = context.status;
  } catch (error) {
    console.error('Error accessing session context:', error);
    // No-op: we'll use the default loading values
  }
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Handle initial loading state with minimum duration
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isInitialLoading) {
      timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, minLoadingTime);
    }
    
    // Clear loading state when auth is resolved
    if (!isLoading && status !== 'loading' && !hasInitialized) {
      setHasInitialized(true);
      
      // Add a slight delay to ensure smooth transition
      setTimeout(() => {
        setIsInitialLoading(false);
        clearTimeout(timer);
      }, 100);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, status, isInitialLoading, minLoadingTime, hasInitialized]);
  
  // Control when to show the loading overlay
  const showLoading = isInitialLoading || (!onlyInitialLoad && isLoading);
  
  return (
    <>
      {showLoading && <LoadingOverlay />}
      {/* Render children even during loading to allow for pre-loading and hydration */}
      <div className={showLoading ? 'invisible' : 'visible'}>
        {children}
      </div>
    </>
  );
} 