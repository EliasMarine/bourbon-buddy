import { NextRequest, NextResponse } from 'next/server';
import { isAccountLocked, getAccountStatus } from '@/lib/login-security';
import { logSecurityEvent } from '@/lib/error-handlers';

/**
 * Helper function to process account status check regardless of HTTP method
 */
async function checkAccountStatus(request: NextRequest, email?: string) {
  try {
    // For GET requests, extract email from query params
    if (!email && request.method === 'GET') {
      const url = new URL(request.url);
      email = url.searchParams.get('email') || undefined;
    }
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required', status: 'error' },
        { status: 400 }
      );
    }
    
    // Get client IP for logging
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check account status
    const status = getAccountStatus(normalizedEmail);
    
    // Log the check (with low severity since this is normal behavior)
    logSecurityEvent(
      'account_lock_status_check',
      { 
        email: normalizedEmail,
        ip: ip.toString(),
        isLocked: status.isLocked
      },
      'low'
    );
    
    // Only return lock status and time - don't reveal attempt count
    const response = NextResponse.json({
      isLocked: status.isLocked,
      remainingTime: status.remainingTime ? Math.ceil(status.remainingTime / 60000) : undefined,
      status: 'success'
    });
    
    // Set CORS headers to ensure this endpoint works in all environments
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, csrf-token');
    
    return response;
  } catch (error) {
    console.error('Error checking account lock status:', error);
    
    const response = NextResponse.json(
      { error: 'Error checking account status', status: 'error' },
      { status: 500 }
    );
    
    // Still set CORS headers on error
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, csrf-token');
    
    return response;
  }
}

/**
 * API endpoint to check if an account is locked before login (POST method)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the body to get the email
    const body = await request.json().catch(() => ({}));
    return checkAccountStatus(request, body.email);
  } catch (error) {
    console.error('Error in POST check-lockout:', error);
    return NextResponse.json(
      { error: 'Invalid request format', status: 'error' },
      { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token, csrf-token'
        }
      }
    );
  }
}

/**
 * Alternative GET method to check lockout status (for simpler integration)
 */
export async function GET(request: NextRequest) {
  return checkAccountStatus(request);
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, csrf-token');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  return response;
} 