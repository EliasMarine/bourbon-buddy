import { NextRequest, NextResponse } from 'next/server';
import { isAccountLocked, getAccountStatus } from '@/lib/login-security';
import { logSecurityEvent } from '@/lib/error-handlers';

/**
 * API endpoint to check if an account is locked before login
 * This is designed to be called from the login page to prevent login attempts
 * for locked accounts
 */
export async function POST(request: NextRequest) {
  try {
    // Don't reveal too much information about account status
    // Only return whether the account is locked and remaining time if it is
    const body = await request.json().catch(() => ({}));
    const { email } = body;
    
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
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
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
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, csrf-token');
    
    return response;
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, csrf-token');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  return response;
} 