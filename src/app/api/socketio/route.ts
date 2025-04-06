import { NextResponse } from 'next/server';
import { Server as IOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Socket } from 'net';

/**
 * IMPORTANT: This route provides Socket.IO support in serverless environments like Vercel.
 * It has limitations compared to a custom server implementation.
 * 
 * For local development with full WebRTC and streaming features:
 * - Use `npm run dev:socket` which uses the custom server.js implementation
 */

// Global singleton to maintain socket.io instance across serverless function calls
let io: IOServer | undefined;
let connections = 0;

// Handle WebSocket upgrade - not fully supported in serverless functions
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const forceNewServer = searchParams.get('force') === 'true';

    // Return status information
    return NextResponse.json({
      status: 'ok',
      message: 'Socket.IO endpoint is accessible. For full WebRTC streaming support, please use a custom server setup.',
      connections: connections,
      serverless: true,
      environment: process.env.NODE_ENV || 'unknown'
    });
  } catch (err) {
    console.error('Error in Socket.IO route handler:', err);
    return NextResponse.json({ 
      status: 'error',
      message: 'Socket.IO initialization failed',
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}

// For CORS
export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Required for Socket.IO
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; 