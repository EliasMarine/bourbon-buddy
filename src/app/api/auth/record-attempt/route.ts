import { NextRequest, NextResponse } from 'next/server';
import { recordFailedLoginAttempt, resetFailedLoginAttempts } from '@/lib/login-security';
import { logSecurityEvent } from '@/lib/error-handlers';

/**
 * API endpoint to record login attempts
 * This allows the frontend to record failed attempts directly
 * Used as a backup and to keep lock state in sync
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, success = false } = body;
    
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
    
    if (success) {
      // Reset attempts on successful login
      resetFailedLoginAttempts(normalizedEmail);
      
      logSecurityEvent(
        'login_attempt_reset',
        { email: normalizedEmail, ip: ip.toString() },
        'low'
      );
      
      return NextResponse.json({ success: true });
    } else {
      // Record failed attempt
      recordFailedLoginAttempt(normalizedEmail, ip.toString());
      
      logSecurityEvent(
        'login_attempt_recorded',
        { email: normalizedEmail, ip: ip.toString() },
        'medium'
      );
      
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Error recording login attempt:', error);
    
    return NextResponse.json(
      { error: 'Error recording login attempt' },
      { status: 500 }
    );
  }
} 