// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only enable in production by default, or when explicitly enabled for dev
const isEnabled = process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED_DEV === 'true';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,
  
  // Disable debug mode completely
  debug: false,

  // Only enable in production by default
  enabled: isEnabled,
  
  // Enable performance monitoring
  enableTracing: true,
  
  // Add custom integrations for better monitoring
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express(),
    new Sentry.Integrations.Prisma(),
    new Sentry.Integrations.Node(),
    // Add breadcrumbs for better debugging
    new Sentry.Integrations.Breadcrumbs({
      console: true,
      http: true,
      fetch: true,
    }),
  ],

  // Process CSP violations
  beforeSend(event, hint) {
    // Only log minimal info in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Sentry Server] Sending event');
    }
    
    // Check if this is a CSP violation
    if (event.message && event.message.startsWith('Content Security Policy')) {
      // Specially tag CSP violations for better filtering
      event.tags = {
        ...event.tags,
        'csp_violation': true,
        'source': 'server',
      };
    }
    
    // Add diagnostic information
    event.tags = {
      ...event.tags,
      'server_timestamp': new Date().toISOString(),
      'test_mode': 'true',
    };
    
    return event;
  },
}); 