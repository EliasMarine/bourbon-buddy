import * as Sentry from "@sentry/nextjs";
import { 
  browserProfilingIntegration, 
  replayIntegration,
  browserTracingIntegration,
} from "@sentry/nextjs";

// Check if SENTRY_ENABLED_DEV is set to true for development environments
const isEnabled = process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED_DEV === 'true';

// Initialize Sentry with client-side configuration
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Use tunneling to avoid CSP issues
  tunnel: '/api/sentry-tunnel',
  
  // Disable debug mode - it causes issues with non-debug bundles
  debug: false,
  
  // Only enable in production by default, or when explicitly enabled for dev
  enabled: isEnabled,
  
  // Adjust these values - set to 1.0 to capture everything during testing
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  
  // Set to 'development' or 'production' for proper environment separation in Sentry
  environment: process.env.NODE_ENV,
  
  // Integrations for full feature set
  integrations: [
    replayIntegration({
      // Additional Replay configuration goes in here
      maskAllText: false,
      blockAllMedia: false,
    }),
    browserTracingIntegration(),
    browserProfilingIntegration(),
  ],

  // More verbose beforeSend to help debug and ensure events are sent
  beforeSend(event, hint) {
    // Only log in development and only to console
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Sentry] Sending event');
    }
    
    // Check if this is a CSP violation
    if (event.message && event.message.startsWith('Content Security Policy')) {
      // Specially tag CSP violations for better filtering
      event.tags = {
        ...event.tags,
        'csp_violation': true,
        'source': 'client',
      };
    }
    
    // Add extra context to help with debugging
    event.tags = {
      ...event.tags,
      'session_id': Math.random().toString(36).substring(2, 15),
      'client_timestamp': new Date().toISOString(),
    };
    
    return event;
  },
});

// This export will instrument router navigations, and is only relevant when you enable tracing
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart; 