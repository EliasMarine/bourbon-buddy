import * as Sentry from "@sentry/nextjs";
import { 
  browserProfilingIntegration, 
  replayIntegration,
  browserTracingIntegration,
} from "@sentry/nextjs";

// Initialize Sentry with client-side configuration
Sentry.init({
  dsn: "https://1354ee39e119c1b9670a897a0692d333@o4509142564667392.ingest.us.sentry.io/4509142568075264",
  
  // Use tunneling to avoid CSP issues
  tunnel: '/api/sentry-tunnel',
  
  // Disable debug mode - it causes issues with non-debug bundles
  debug: false,
  
  // Set environment
  environment: process.env.NODE_ENV,
  
  // Adjust these values - set to 1.0 to capture everything during testing
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1, // 10% of sessions captured
  replaysOnErrorSampleRate: 1.0, // 100% of error sessions captured
  
  // Integrations for full feature set
  integrations: [
    replayIntegration({
      // Session Replay configuration
      maskAllText: true,
      blockAllMedia: true,
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

// This export will instrument router navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart; 