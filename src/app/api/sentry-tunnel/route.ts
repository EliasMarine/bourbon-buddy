/**
 * Sentry Tunnel API endpoint
 * 
 * This API route acts as a proxy for Sentry events, allowing the browser to send
 * events to your server first, which then forwards them to Sentry. This helps
 * avoid Content Security Policy (CSP) issues that might block direct connections
 * to Sentry domains from the browser.
 */

import { NextRequest, NextResponse } from 'next/server';

// Hardcoded Sentry values - this simplifies the implementation and avoids DSN parsing errors
const SENTRY_KEY = "1354ee39e119c1b9670a897a0692d333";
const SENTRY_HOST = "o4509142564667392.ingest.us.sentry.io";
const SENTRY_PROJECT_ID = "4509142568075264";

export async function POST(request: NextRequest) {
  try {
    // Basic validation
    if (!SENTRY_KEY || !SENTRY_HOST || !SENTRY_PROJECT_ID) {
      console.error('[Sentry Tunnel] Missing required Sentry configuration');
      return NextResponse.json(
        { error: 'Sentry configuration incomplete' },
        { status: 500 }
      );
    }

    // Get the envelope data
    const body = await request.text().catch(err => {
      console.error('[Sentry Tunnel] Error reading request body:', err);
      return null;
    });

    // Validate request body
    if (!body) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      );
    }

    // Construct the Sentry envelope URL
    const sentryUrl = `https://${SENTRY_HOST}/api/${SENTRY_PROJECT_ID}/envelope/`;
    
    try {
      // Always create a completely new envelope to avoid format issues
      const newEnvelope = createCompletelyNewEnvelope(body);
      
      // Forward to Sentry with robust error handling
      const sentryResponse = await fetch(sentryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${SENTRY_KEY}, sentry_client=sentry.tunnel.nextjs/1.0.0`,
        },
        body: newEnvelope,
        // Add timeout to prevent hanging requests
        // @ts-ignore - Next.js fetch implementation ignores these properties but they help in some environments
        timeout: 10000, // 10 seconds timeout
      });

      // Handle Sentry response
      if (!sentryResponse.ok) {
        const responseText = await sentryResponse.text().catch(() => 'No response text');
        console.error('[Sentry Tunnel] Error from Sentry:', sentryResponse.status, responseText);
        
        // Return success status to client to avoid retries
        return NextResponse.json(
          { status: 'accepted', message: 'Event accepted but forwarding to Sentry failed' },
          { status: 200 }
        );
      }

      // Success - return the Sentry response
      console.log('[Sentry Tunnel] Successfully forwarded to Sentry');
      
      return new Response(JSON.stringify({ status: 'success' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (fetchError) {
      // More detailed logging for network errors
      console.error('[Sentry Tunnel] Network error while forwarding to Sentry:', fetchError);
      
      // Return success status to client, to avoid retries
      return NextResponse.json(
        { 
          status: 'accepted', 
          message: 'Event accepted but forwarding to Sentry failed'
        },
        { status: 200 }
      );
    }
  } catch (error) {
    // Handle any other errors
    console.error('[Sentry Tunnel] Unhandled error:', error);
    // Return success status to client, to avoid retries
    return NextResponse.json(
      { 
        status: 'accepted',
        message: 'Event captured but processing failed'
      },
      { status: 200 }
    );
  }
}

// Helper function to create a completely new envelope from any data
function createCompletelyNewEnvelope(data: string): string {
  const eventId = generateUUID();
  const timestamp = new Date().toISOString();
  
  // Create a new header with a unique ID
  const header = JSON.stringify({
    event_id: eventId,
    sent_at: timestamp
  });
  
  // Try to parse the original data to extract useful information
  let payload;
  try {
    // Try to parse as JSON
    const parsedData = JSON.parse(data);
    
    // If it has an event_id, use that instead
    if (parsedData.event_id) {
      payload = JSON.stringify({
        ...parsedData,
        timestamp: parsedData.timestamp || Math.floor(Date.now() / 1000)
      });
    } else {
      payload = JSON.stringify(parsedData);
    }
  } catch (e) {
    // If we can't parse the data, try to extract the payload part
    const parts = data.split('\n');
    if (parts.length >= 3) {
      // Typical envelope format has header, item header, and payload
      try {
        // Try to use the original payload if it exists and looks valid
        payload = parts.slice(2).join('\n');
        JSON.parse(payload); // Test if it's valid JSON
      } catch {
        // If that fails, create a new payload
        payload = JSON.stringify({
          event_id: eventId,
          timestamp: Math.floor(Date.now() / 1000),
          level: "error",
          message: "Error processing Sentry event in tunnel",
          original_payload_fragment: data.substring(0, 1000) // Limited fragment for debugging
        });
      }
    } else {
      // Not in expected format, create a new payload
      payload = JSON.stringify({
        event_id: eventId,
        timestamp: Math.floor(Date.now() / 1000),
        level: "error",
        message: "Malformed Sentry envelope received",
        original_payload_fragment: data.substring(0, 1000) // Limited fragment for debugging
      });
    }
  }
  
  // Create item header
  const itemHeader = JSON.stringify({
    type: "event",
    length: Buffer.from(payload).length // Use buffer length for accurate byte count
  });
  
  // Ensure there are EXPLICIT newlines between each part
  // This is critical for Sentry's envelope format
  return `${header}\n${itemHeader}\n${payload}`;
}

// Helper function to generate a UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
} 