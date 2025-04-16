import * as Sentry from '@sentry/nextjs'

/**
 * Initialize Sentry for client-side monitoring
 */
export function initSentry() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      // Only capture errors in production
      enabled: process.env.NODE_ENV === 'production',
      
      // Skip Supabase auth requests in beforeSend hook
      beforeSend: (event, hint) => {
        // Extract URL if available
        const request = event.request || {};
        const url = request.url || '';
        
        // Skip Supabase auth-related errors
        if (url.includes('/auth/v1/') || url.includes('supabase')) {
          // Don't send these to Sentry to avoid leaking auth info
          console.warn('Supabase auth error not sent to Sentry:', event.message);
          return null;
        }
        
        return event;
      }
    })
  }
}

/**
 * Create a custom Sentry scope for capturing errors
 */
export function captureError(error: Error, context?: Record<string, any>) {
  // Skip CORS and network errors that are likely related to Supabase auth
  if (
    error.message?.includes('CORS') ||
    error.message?.includes('NetworkError') ||
    error.message?.includes('Failed to fetch')
  ) {
    // Don't send these to Sentry to reduce noise
    console.warn('CORS/network error not sent to Sentry:', error.message);
    return;
  }
  
  Sentry.withScope((scope) => {
    // Add any additional context
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    Sentry.captureException(error);
  });
} 