/**
 * Sentry Test API endpoint - Simplified version
 */

import { NextRequest, NextResponse } from 'next/server';

// Static response to prevent infinite loops
export async function GET(request: NextRequest) {
  // Return a static response with cache control headers
  return NextResponse.json(
    {
      status: "Static Test Response",
      message: "This is a simplified static response to prevent infinite loops",
      timestamp: new Date().toISOString(),
      tests: {
        dnsLookup: {
          success: true,
          message: "DNS resolution test bypassed"
        },
        directConnection: {
          status: 200,
          message: "Connection test bypassed"
        }
      }
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=3600',
      },
    }
  );
} 