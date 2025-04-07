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
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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
    return NextResponse.json({
      isLocked: status.isLocked,
      remainingTime: status.remainingTime ? Math.ceil(status.remainingTime / 60000) : undefined
    });
  } catch (error) {
    console.error('Error checking account lock status:', error);
    
    return NextResponse.json(
      { error: 'Error checking account status' },
      { status: 500 }
    );
  }
} 