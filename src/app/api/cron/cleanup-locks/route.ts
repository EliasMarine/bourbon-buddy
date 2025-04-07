import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredLocks } from '@/lib/login-security';
import { logSecurityEvent } from '@/lib/error-handlers';

/**
 * This endpoint is designed to be called by a scheduled job (cron)
 * to clean up expired login locks and prevent memory leaks.
 * 
 * It should be protected with an API key or other authorization mechanism.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this request is authorized
    // This should be a secure API key or other authentication mechanism
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logSecurityEvent(
        'unauthorized_cleanup_attempt',
        { path: '/api/cron/cleanup-locks' },
        'high'
      );
      
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Verify the API key matches the expected value from environment
    if (apiKey !== process.env.CRON_SECRET) {
      logSecurityEvent(
        'invalid_api_key',
        { path: '/api/cron/cleanup-locks' },
        'high'
      );
      
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Run the cleanup process
    cleanupExpiredLocks();
    
    // Log the successful cleanup
    logSecurityEvent(
      'account_locks_cleanup',
      { success: true },
      'low'
    );
    
    return NextResponse.json({
      success: true,
      message: 'Expired login attempt locks have been cleaned up',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in cleanup locks endpoint:', error);
    
    logSecurityEvent(
      'cleanup_locks_error',
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'medium'
    );
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 