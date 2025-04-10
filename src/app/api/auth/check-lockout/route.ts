import { NextRequest, NextResponse } from 'next/server';
import { isAccountLocked, getAccountStatus } from '@/lib/login-security';
import { logSecurityEvent } from '@/lib/error-handlers';
import { DEFAULT_FALLBACK_IP } from '@/config/constants';

// CORS headers used across all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token, csrf-token'
};

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
    
    // Get client IP for logging
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               DEFAULT_FALLBACK_IP;
    
    if (!email) {
      // Log missing email parameter for security insight
      logSecurityEvent('invalid_email_param', { ip: ip.toString() }, 'low');
      
      return NextResponse.json(
        { error: 'Email is required', status: 'error' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Get account status with graceful error handling
    let status;
    try {
      status = getAccountStatus(normalizedEmail);
    } catch (statusError) {
      console.error('Error getting account status:', statusError);
      
      logSecurityEvent(
        'account_status_error',
        { 
          email: normalizedEmail,
          ip: ip.toString(),
          error: statusError instanceof Error ? statusError.message : String(statusError)
        },
        'medium'
      );
      
      return NextResponse.json(
        { error: 'Unable to retrieve account status', status: 'error' },
        { status: 500, headers: corsHeaders }
      );
    }
    
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
    return NextResponse.json(
      {
        isLocked: status.isLocked,
        // Return remainingTime in seconds for more precise frontend handling
        remainingTimeSeconds: status.remainingTime ? Math.ceil(status.remainingTime / 1000) : undefined,
        // Keep the original minutes value for backward compatibility
        remainingTime: status.remainingTime ? Math.ceil(status.remainingTime / 60000) : undefined,
        status: 'success'
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error checking account lock status:', error);
    
    return NextResponse.json(
      { error: 'Error checking account status', status: 'error' },
      { status: 500, headers: corsHeaders }
    );
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
      { status: 400, headers: corsHeaders }
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
  return new NextResponse(null, { 
    status: 204,
    headers: {
      ...corsHeaders,
      'Access-Control-Max-Age': '86400' // 24 hours
    }
  });
} 