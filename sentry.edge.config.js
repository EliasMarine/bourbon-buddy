// This file configures the initialization of Sentry for edge runtimes
// The config you add here will be used whenever your app uses an edge runtime.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

// Force enable for testing
const isEnabled = true;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Disable debug mode completely
  debug: false,
  
  // Force enable for testing
  enabled: true,
  
  // EDGE RUNTIME COMPATIBILITY: Remove Breadcrumbs integration which causes errors in Edge
  // integrations: [
  //  new Sentry.Integrations.Breadcrumbs({ 
  //    console: true, 
  //    fetch: true, 
  //    xhr: true 
  //  }),
  // ],

  // Capture CSP violations
  beforeSend(event, hint) {
    // Only log minimal info in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Sentry Edge] Sending event');
    }
    
    // Check if this is a CSP violation
    if (event.message && event.message.startsWith('Content Security Policy')) {
      // Specially tag CSP violations for better filtering
      event.tags = {
        ...event.tags,
        'csp_violation': true,
        'source': 'edge',
      };
    }
    
    // Add diagnostic information
    event.tags = {
      ...event.tags,
      'edge_timestamp': new Date().toISOString(),
      'test_mode': 'true',
    };
    
    return event;
  },
}); 