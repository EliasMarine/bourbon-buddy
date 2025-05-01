'use client';

import { useEffect } from 'react';

// Local implementation instead of importing from external module
function generateCsrfToken(): string {
  // Create a random token
  const randomPart = Math.random().toString(36).substring(2);
  const timestamp = Date.now().toString(36);
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  
  // Combine them into a token
  return `${randomPart}-${timestamp}-${uuid}`;
}

/**
 * Component to initialize CSRF token on the client side
 * This should be included in the layout to ensure it runs on all pages
 */
export default function CSRFTokenInitializer() {
  useEffect(() => {
    async function initializeCsrfToken() {
      try {
        // Check if we already have a CSRF token
        const existingToken = sessionStorage.getItem('csrfToken');
        if (existingToken) {
          console.log('CSRF token already exists in session storage');
          return;
        }

        // Request a new CSRF token
        const response = await fetch('/api/auth/csrf', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });

        if (!response.ok) {
          console.error('Failed to fetch CSRF token:', response.status);
          return;
        }

        const data = await response.json();
        if (data.csrfToken) {
          // Store in sessionStorage for easy access
          sessionStorage.setItem('csrfToken', data.csrfToken);
          console.log('CSRF token initialized successfully');
        }
      } catch (error) {
        console.error('Error initializing CSRF token:', error);
        
        // Fallback: generate a client-side token if server is unavailable
        try {
          const clientToken = generateCsrfToken();
          if (clientToken) {
            sessionStorage.setItem('csrfToken', clientToken);
            console.log('Fallback CSRF token generated on client');
          }
        } catch (fallbackError) {
          console.error('Failed to generate fallback CSRF token:', fallbackError);
        }
      }
    }

    initializeCsrfToken();
  }, []);

  // This component doesn't render anything visible
  return null;
} 