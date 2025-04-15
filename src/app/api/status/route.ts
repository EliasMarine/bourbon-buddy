/**
 * API Status endpoint
 * 
 * This endpoint checks various services and returns their status.
 * Useful for debugging connection issues on the client side.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

export async function GET(request: NextRequest) {
  // Start with all services as unknown
  const statusResults = {
    timestamp: new Date().toISOString(),
    services: {
      application: {
        status: 'ok',
        version: process.env.NEXT_PUBLIC_APP_VERSION || 'development'
      },
      supabase: {
        status: 'unknown',
        message: '',
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
          `${process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 15)}...` : 
          'not configured'
      },
      sentry: {
        status: 'unknown',
        message: '',
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ? 
          'configured' : 
          'not configured'
      },
      webhooks: {
        status: 'unknown',
        endpoints: []
      }
    }
  };

  // Check Supabase connection
  try {
    // Create a temporary client
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Test a simple query
    const { data, error } = await supabase
      .from('spirits')
      .select('count(*)')
      .limit(1)
      .maybeSingle();
    
    if (error) {
      statusResults.services.supabase.status = 'error';
      statusResults.services.supabase.message = error.message;
    } else {
      statusResults.services.supabase.status = 'ok';
      statusResults.services.supabase.message = 'Connection successful';
    }
  } catch (error) {
    statusResults.services.supabase.status = 'error';
    statusResults.services.supabase.message = error instanceof Error ? 
      error.message : 
      'Unknown error';
  }

  // Check Sentry configuration
  try {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Capture a test message instead of using the transaction API
      Sentry.captureMessage('API Status Check', {
        level: 'info',
        tags: {
          test: 'api-status'
        },
        extra: {
          endpoint: '/api/status',
          timestamp: new Date().toISOString()
        }
      });
      
      statusResults.services.sentry.status = 'ok';
      statusResults.services.sentry.message = 'Configuration valid';
    } else {
      statusResults.services.sentry.status = 'not_configured';
      statusResults.services.sentry.message = 'Sentry DSN not found';
    }
  } catch (error) {
    statusResults.services.sentry.status = 'error';
    statusResults.services.sentry.message = error instanceof Error ? 
      error.message : 
      'Unknown error';
  }

  // Return all status results
  return NextResponse.json(statusResults);
}

// Helper to sanitize URLs for display
function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return 'not configured';
  
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.port ? ':' + urlObj.port : ''}`;
  } catch (e) {
    return 'invalid url format';
  }
} 