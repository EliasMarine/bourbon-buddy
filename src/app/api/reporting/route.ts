import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Check if SENTRY_ENABLED_DEV is set to true for development environments
const isEnabled = process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED_DEV === 'true';

// Initialize Sentry (this is in addition to the Sentry configuration files)
if (isEnabled) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

// Process and log a CSP violation report
export async function POST(request: NextRequest) {
  try {
    // Parse the report data
    const reportData = await request.json();
    
    // Check for specific CSP report format
    const cspReport = reportData['csp-report'] || reportData['body'] || reportData;
    
    // Log the CSP violation to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log("CSP Violation Report:");
      console.log(JSON.stringify(cspReport, null, 2));
    }
    
    // Only send to Sentry if it's enabled
    if (isEnabled) {
      // Create a useful message for Sentry
      const blockedUri = cspReport['blocked-uri'] || cspReport.blockedURL || 'unknown';
      const violatedDirective = cspReport['violated-directive'] || cspReport.effectiveDirective || 'unknown';
      const documentUri = cspReport['document-uri'] || cspReport.documentURL || request.url;
      
      // Create a meaningful error message
      const errorMessage = `CSP Violation: ${violatedDirective} directive violated by ${blockedUri}`;
      
      // Send to Sentry with detailed context
      Sentry.captureMessage(errorMessage, {
        level: 'warning',
        tags: {
          'csp.blocked_uri': blockedUri,
          'csp.violated_directive': violatedDirective,
          'csp.document_uri': documentUri,
          'csp_violation': true,
          'source': 'api_endpoint',
        },
        extra: {
          full_report: cspReport,
          headers: Object.fromEntries(request.headers),
          url: request.url,
        }
      });
    }
    
    // Return a success response
    return NextResponse.json({ success: true });
  } catch (error) {
    // Log the error
    console.error("Error processing CSP report:", error);
    
    // Report the error to Sentry if enabled
    if (isEnabled) {
      Sentry.captureException(error);
    }
    
    // Return an error response
    return NextResponse.json(
      { success: false, error: "Failed to process report" }, 
      { status: 500 }
    );
  }
} 