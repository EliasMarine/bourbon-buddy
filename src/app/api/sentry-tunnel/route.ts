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

    // Handle POST request to forward to Sentry
    const sentryUrl = process.env.NEXT_PUBLIC_SENTRY_TUNNEL_URL
    if (!sentryUrl) {
      console.error('[Sentry Tunnel] Missing Sentry tunnel URL')
      return NextResponse.json({ message: '[Sentry Tunnel] Configuration error' }, { status: 503 })
    }

    // Extract DSN from environment
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN
    if (!sentryDsn) {
      console.error('[Sentry Tunnel] Missing Sentry DSN')
      return NextResponse.json({ message: '[Sentry Tunnel] Configuration error' }, { status: 503 })
    }

    // Ensure the body is formatted as a valid Sentry envelope with newlines
    let requestBody: string | null = null
    if (request.body) {
      const text = await request.text()
      const lines = text.split('\n')
      const formattedText = lines.join('\n') + '\n'
      requestBody = formattedText
    }

    // Forward to Sentry with robust error handling
    const sentryResponse = await fetch(sentryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'Authorization': `DSN ${sentryDsn}`,
      },
      body: requestBody,
      // Add these for Node.js environment to help with DNS resolution
      // @ts-ignore - Next.js fetch implementation ignores these properties but they help in some environments
      agent: null,
      timeout: 10000, // 10 seconds timeout
    });

    // Handle Sentry response
    if (!sentryResponse.ok) {
      const responseText = await sentryResponse.text().catch(() => 'No response text');
      console.error('[Sentry Tunnel] Error from Sentry:', sentryResponse.status, responseText);
      
      // If we get a 400 with "missing newline" error, try an alternative approach
      if (sentryResponse.status === 400 && responseText.includes('missing newline')) {
        console.log('[Sentry Tunnel] Attempting alternative envelope format fix');
        
        // Create completely new envelope as a last resort
        const alternativeEnvelope = createCompletelyNewEnvelope(await request.text());
        
        // Second attempt with completely reformatted envelope
        const retryResponse = await fetch(sentryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-sentry-envelope',
            'Authorization': `DSN ${sentryDsn}`,
          },
          body: alternativeEnvelope,
          // @ts-ignore
          agent: null,
          timeout: 10000,
        });
        
        if (retryResponse.ok) {
          console.log('[Sentry Tunnel] Successfully forwarded to Sentry after retry');
          const retryData = await retryResponse.text().catch(() => '{"status":"success"}');
          return new Response(retryData, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          console.error('[Sentry Tunnel] Retry also failed:', await retryResponse.text().catch(() => 'No response text'));
          // Instead of returning an error, return a 200 so client doesn't try to retry
          return NextResponse.json(
            { status: 'accepted', message: 'Event accepted but forwarding to Sentry failed' },
            { status: 200 }
          );
        }
      }
      
      // For other errors, return 200 to avoid client retries that might cause more issues
      return NextResponse.json(
        { status: 'accepted', message: 'Event accepted but forwarding to Sentry failed' },
        { status: 200 }
      );
    }

    // Success - return the Sentry response
    const responseData = await sentryResponse.text().catch(() => '{"status":"success"}');
    console.log('[Sentry Tunnel] Successfully forwarded to Sentry');
    
    return new Response(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
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

// Helper function to check if envelope format is valid
function isValidSentryEnvelope(body: string): boolean {
  // A valid Sentry envelope has at least 2 newlines
  // One after the header, one after the item header
  const newlines = countOccurrences(body, '\n');
  if (newlines < 2) return false;
  
  // Try to parse the first line as JSON
  const firstLineEnd = body.indexOf('\n');
  if (firstLineEnd === -1) return false;
  
  try {
    const header = JSON.parse(body.substring(0, firstLineEnd));
    // Header should have at least event_id and sent_at
    if (!header.event_id) return false;
    
    // Check if second part is also valid JSON
    const secondLineEnd = body.indexOf('\n', firstLineEnd + 1);
    if (secondLineEnd === -1) return false;
    
    const itemHeader = JSON.parse(body.substring(firstLineEnd + 1, secondLineEnd));
    // Item header should have type and length
    return !!(itemHeader.type && typeof itemHeader.length === 'number');
  } catch (e) {
    return false;
  }
}

// Helper function to fix envelope format
function fixEnvelopeFormat(body: string): string {
  try {
    // Check if the body contains any newlines
    const firstNewlineIndex = body.indexOf('\n');
    
    if (firstNewlineIndex === -1) {
      // No newlines at all, likely a malformed JSON
      // Create a completely new envelope instead of trying to parse
      return createCompletelyNewEnvelope(body);
    } else {
      // Has at least one newline, but might not have two
      const secondNewlineIndex = body.indexOf('\n', firstNewlineIndex + 1);
      
      if (secondNewlineIndex === -1) {
        // Only one newline, create a new envelope
        return createCompletelyNewEnvelope(body);
      } else {
        // Has at least two newlines, check if parts look valid
        try {
          const header = body.substring(0, firstNewlineIndex);
          const itemHeader = body.substring(firstNewlineIndex + 1, secondNewlineIndex);
          const payload = body.substring(secondNewlineIndex + 1);
          
          // Try parsing header and item header to verify they're valid JSON
          JSON.parse(header);
          JSON.parse(itemHeader);
          
          // If we get here, the envelope format seems valid
          // Return with explicit newlines to ensure proper formatting
          return `${header}\n${itemHeader}\n${payload}`;
        } catch (e) {
          // If parsing fails, create a new envelope
          return createCompletelyNewEnvelope(body);
        }
      }
    }
  } catch (e) {
    // If all parsing fails, create a completely new envelope
    return createCompletelyNewEnvelope(body);
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
  
  // Sanitize data - handle potential JSON parsing issues
  let payload = data;
  try {
    // Try to parse and re-stringify to ensure valid JSON
    const jsonData = JSON.parse(data);
    // If it has an event_id, use that instead
    if (jsonData.event_id) {
      payload = JSON.stringify({
        ...jsonData,
        // Ensure these fields are present
        event_id: jsonData.event_id,
        timestamp: jsonData.timestamp || Math.floor(Date.now() / 1000)
      });
    } else {
      payload = JSON.stringify(jsonData);
    }
  } catch (e) {
    // Not valid JSON, pass as-is but wrapped in an object
    payload = JSON.stringify({
      event_id: eventId,
      timestamp: Math.floor(Date.now() / 1000),
      level: "error",
      message: "Error processing Sentry event in tunnel",
      original_payload: data.substring(0, 4096) // Limit size to avoid very large messages
    });
  }
  
  // Create item header
  const itemHeader = JSON.stringify({
    type: "event",
    length: Buffer.from(payload).length // Use buffer length for binary safety
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

// Helper function to count occurrences of a substring
function countOccurrences(str: string, subStr: string): number {
  return str.split(subStr).length - 1;
} 