/**
 * Login Security Module
 * 
 * Provides account lockout mechanisms to prevent brute force attacks
 * and password cracking attempts.
 */

import { logSecurityEvent } from './error-handlers';

// Interface for tracking failed login attempts
export interface FailedAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  locked: boolean;
  lockExpires: number | null;
}

// Security configuration
export const LOGIN_SECURITY = {
  MAX_ATTEMPTS: 5,               // Maximum failed attempts before lockout
  LOCKOUT_DURATION: 15 * 60 * 1000,  // 15 minutes (in milliseconds)
  ATTEMPT_WINDOW: 60 * 60 * 1000,    // 1 hour window to count attempts (in milliseconds)
  SUSPICIOUS_IP_THRESHOLD: 10,   // Attempts from different accounts on same IP
  IP_BAN_DURATION: 24 * 60 * 60 * 1000  // 24 hours (in milliseconds)
}

// In-memory store for failed attempts (in production, use Redis or database)
// Map: email -> FailedAttempt
const failedLoginAttempts = new Map<string, FailedAttempt>();

// Track suspicious IPs (multiple failed logins across different accounts)
// Map: ip -> { count, timestamp }
const suspiciousIPs = new Map<string, { count: number, since: number, locked: boolean, lockExpires: number | null }>();

/**
 * Checks if an account is locked due to too many failed attempts
 */
export function isAccountLocked(identifier: string): boolean {
  const attempts = failedLoginAttempts.get(identifier);
  if (!attempts) return false;
  
  // If locked and lock hasn't expired, account is locked
  if (attempts.locked && attempts.lockExpires && Date.now() < attempts.lockExpires) {
    return true;
  }
  
  // If lock expired, reset the lock
  if (attempts.locked && attempts.lockExpires && Date.now() >= attempts.lockExpires) {
    attempts.locked = false;
    attempts.count = 0;
    failedLoginAttempts.set(identifier, attempts);
    return false;
  }
  
  return false;
}

/**
 * Checks if an IP is blocked due to suspicious activity
 */
export function isIPBlocked(ip: string): boolean {
  const ipInfo = suspiciousIPs.get(ip);
  if (!ipInfo) return false;
  
  if (ipInfo.locked && ipInfo.lockExpires && Date.now() < ipInfo.lockExpires) {
    return true;
  }
  
  // Reset if expired
  if (ipInfo.locked && ipInfo.lockExpires && Date.now() >= ipInfo.lockExpires) {
    ipInfo.locked = false;
    ipInfo.count = 0;
    suspiciousIPs.set(ip, ipInfo);
    return false;
  }
  
  return false;
}

/**
 * Records a failed login attempt and locks account if threshold is reached
 */
export function recordFailedLoginAttempt(identifier: string, ip?: string): void {
  const now = Date.now();
  const attempts = failedLoginAttempts.get(identifier);
  
  // Track for this specific account
  if (!attempts) {
    failedLoginAttempts.set(identifier, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
      locked: false,
      lockExpires: null
    });
  } else {
    // Reset count if window has passed
    if (now - attempts.firstAttempt > LOGIN_SECURITY.ATTEMPT_WINDOW) {
      failedLoginAttempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        locked: false,
        lockExpires: null
      });
    } else {
      // Increment counter and update timestamps
      attempts.count += 1;
      attempts.lastAttempt = now;
      
      // Lock account if too many attempts
      if (attempts.count >= LOGIN_SECURITY.MAX_ATTEMPTS) {
        attempts.locked = true;
        attempts.lockExpires = now + LOGIN_SECURITY.LOCKOUT_DURATION;
        
        // Log security event for account lockout
        logSecurityEvent(
          'account_lockout',
          { 
            identifier,
            ip: ip || 'unknown',
            attempts: attempts.count,
            lockDuration: LOGIN_SECURITY.LOCKOUT_DURATION / 60000
          },
          'high'
        );
      }
      
      failedLoginAttempts.set(identifier, attempts);
    }
  }
  
  // Track for IP-based blocking (if IP is provided)
  if (ip) {
    const ipData = suspiciousIPs.get(ip) || { count: 0, since: now, locked: false, lockExpires: null };
    
    // Reset if older than window
    if (now - ipData.since > LOGIN_SECURITY.ATTEMPT_WINDOW) {
      ipData.count = 1;
      ipData.since = now;
      ipData.locked = false;
      ipData.lockExpires = null;
    } else {
      ipData.count += 1;
      
      // If IP has too many attempts across different accounts, block it
      if (ipData.count >= LOGIN_SECURITY.SUSPICIOUS_IP_THRESHOLD) {
        ipData.locked = true;
        ipData.lockExpires = now + LOGIN_SECURITY.IP_BAN_DURATION;
        
        logSecurityEvent(
          'ip_blocked',
          { 
            ip,
            attempts: ipData.count,
            lockDuration: LOGIN_SECURITY.IP_BAN_DURATION / 3600000
          },
          'critical'
        );
      }
    }
    
    suspiciousIPs.set(ip, ipData);
  }
}

/**
 * Resets failed login attempts on successful login
 */
export function resetFailedLoginAttempts(identifier: string): void {
  failedLoginAttempts.delete(identifier);
}

/**
 * Gets account status for monitoring
 */
export function getAccountStatus(identifier: string): { 
  isLocked: boolean, 
  attempts: number, 
  remainingTime?: number 
} {
  const attempts = failedLoginAttempts.get(identifier);
  
  if (!attempts) {
    return { isLocked: false, attempts: 0 };
  }
  
  const isLocked = isAccountLocked(identifier);
  const remainingTime = attempts.lockExpires 
    ? Math.max(0, attempts.lockExpires - Date.now()) 
    : undefined;
    
  return {
    isLocked,
    attempts: attempts.count,
    remainingTime
  };
}

/**
 * Clears expired locks and old records (maintenance)
 * Should be called periodically, such as via a cron job
 */
export function cleanupExpiredLocks(): void {
  const now = Date.now();
  
  // Clean account locks - using Array.from to fix iterator issues
  Array.from(failedLoginAttempts.entries()).forEach(([identifier, data]) => {
    if (data.locked && data.lockExpires && data.lockExpires < now) {
      // Lock expired
      failedLoginAttempts.delete(identifier);
    } else if (now - data.lastAttempt > LOGIN_SECURITY.ATTEMPT_WINDOW * 2) {
      // Old record, no recent activity
      failedLoginAttempts.delete(identifier);
    }
  });
  
  // Clean IP locks - using Array.from to fix iterator issues
  Array.from(suspiciousIPs.entries()).forEach(([ip, data]) => {
    if (data.locked && data.lockExpires && data.lockExpires < now) {
      // Lock expired
      suspiciousIPs.delete(ip);
    } else if (now - data.since > LOGIN_SECURITY.ATTEMPT_WINDOW * 2) {
      // Old record
      suspiciousIPs.delete(ip);
    }
  });
}

/**
 * Security check to ensure test endpoints aren't available in production
 * Call this at application startup
 */
export function ensureNoTestEndpoints(): void {
  if (process.env.NODE_ENV === 'production') {
    try {
      // Check if test endpoints exist
      const testEndpoints = [
        '/api/test-login-security',
        '/dev/test-security'
      ];

      // Log a critical security event if any of these files exist in production
      const fs = require('fs');
      const path = require('path');
      
      testEndpoints.forEach(endpoint => {
        const relativePath = endpoint.startsWith('/api') 
          ? `src/app${endpoint}/route.ts` 
          : `src/app${endpoint}/page.tsx`;
        
        const fullPath = path.join(process.cwd(), relativePath);
        
        if (fs.existsSync(fullPath)) {
          // Critical security risk: test endpoints should never be present in production
          logSecurityEvent(
            'test_endpoint_in_production',
            { endpoint, path: fullPath },
            'critical'
          );
          
          console.error(`
          ╔════════════════════════════════════════════════════════╗
          ║                  SECURITY RISK ALERT                    ║
          ╠════════════════════════════════════════════════════════╣
          ║ Test endpoint detected in production environment:       ║
          ║ ${endpoint.padEnd(52, ' ')} ║
          ║                                                        ║
          ║ This is a severe security risk! Test endpoints must    ║
          ║ never be deployed to production.                       ║
          ║                                                        ║
          ║ Action required: Remove this file immediately and      ║
          ║ redeploy the application.                              ║
          ╚════════════════════════════════════════════════════════╝
          `);
        }
      });
    } catch (error) {
      console.error('Error checking for test endpoints:', error);
    }
  }
} 