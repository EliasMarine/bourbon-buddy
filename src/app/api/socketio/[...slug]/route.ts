import { NextResponse } from 'next/server';

/**
 * Socket.IO API route handler
 * 
 * For full WebSocket support, make sure to use:
 * - Development: `npm run dev:socket`
 * - Production: `npm run start:socket`
 * 
 * These commands use the custom server implementation in server.js.
 */

// Handle Socket.IO polling/WebSocket traffic
export async function GET(request: Request) {
  // Get the host from the request headers
  const host = request.headers.get('host') || '';
  
  // Return a JSON response with CORS headers
  return new Response(JSON.stringify({
    status: 'error',
    message: 'Socket.IO endpoint is active but direct API routes cannot handle WebSocket connections. Please ensure you are running the app with the custom server.',
    serverTime: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store, max-age=0'
    },
  });
}

export async function POST(request: Request) {
  return new Response(JSON.stringify({
    status: 'error',
    message: 'Socket.IO endpoint is active but direct API routes cannot handle WebSocket connections. Please ensure you are running the app with the custom server.',
    serverTime: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store, max-age=0'
    },
  });
}

export async function OPTIONS(request: Request) {
  // Handle preflight requests for CORS
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// These are needed to ensure the route handlers work correctly with Socket.IO
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; 