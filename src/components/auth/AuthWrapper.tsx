'use client';

import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import AuthLoadingGuard from './AuthLoadingGuard';
import { useSupabase } from '@/components/providers/SupabaseProvider';

// List of route prefixes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/collection',
  '/streams/create',
];

// List of routes that should never show the loading guard
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/about',
  '/pricing',
  '/faq',
  '/explore',
];

// Routes that need registration verification
const NEEDS_VERIFICATION = [
  '/dashboard',
  '/profile',
  '/collection',
];

interface AuthWrapperProps {
  children: React.ReactNode;
}

/**
 * AuthWrapper - Smart component that determines if the current route
 * needs authentication protection and applies a loading guard if so.
 * 
 * IMPORTANT: This component does NOT perform user sync operations.
 * All user synchronization is handled by the SupabaseProvider exclusively.
 */
export default function AuthWrapper({ children }: AuthWrapperProps) {
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const { user, userSynced } = useSupabase();
  
  // Initialize in useEffect to avoid hydration issues
  useEffect(() => {
    setIsReady(true);
  }, []);
  
  // Before client-side hydration, render children without protection
  if (!isReady) {
    return <>{children}</>;
  }
  
  // Check if the current path is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if the current path is explicitly public
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route)
  );
  
  // Check if the path needs verification and we have a user but they're not verified
  const needsVerification = user && !userSynced && NEEDS_VERIFICATION.some(route =>
    pathname.startsWith(route)
  );
  
  // Make sure we only render the loading guard when necessary
  if (isProtectedRoute && !isPublicRoute) {
    return <AuthLoadingGuard>{children}</AuthLoadingGuard>;
  }
  
  // For public routes, just render the children directly
  return <>{children}</>;
} 