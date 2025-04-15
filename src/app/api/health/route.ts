/**
 * Health check endpoint
 * 
 * This endpoint provides a simple health check for the application.
 * Used by monitoring services to determine if the application is alive.
 */

import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// This is a stub route file created for development builds
// The original file has been temporarily backed up

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || 'development'
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    message: 'This is a stub API route for development builds.' 
  });
}
