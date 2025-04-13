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
  consecutiveLockouts: number; // Track how many times account has been locked
}

// Security configuration
export const LOGIN_SECURITY = {
  MAX_ATTEMPTS: 5,               // Maximum failed attempts before lockout
  // Progressive lockout durations based on consecutive lockouts
  LOCKOUT_DURATIONS: [
    15 * 60 * 1000,              // First lockout: 15 minutes
    30 * 60 * 1000,              // Second lockout: 30 minutes
    60 * 60 * 1000,              // Third lockout: 1 hour
    3 * 60 * 60 * 1000,          // Fourth lockout: 3 hours
    24 * 60 * 60 * 1000,         // Fifth+ lockout: 24 hours
  ],
  ATTEMPT_WINDOW: 60 * 60 * 1000,    // 1 hour window to count attempts (in milliseconds)
  SUSPICIOUS_IP_THRESHOLD: 10,   // Attempts from different accounts on same IP
  IP_BAN_DURATION: 24 * 60 * 60 * 1000,  // 24 hours (in milliseconds)
  // Track IP lockout counts for progressive blocking
  IP_BLOCK_DURATIONS: [
    1 * 60 * 60 * 1000,          // First block: 1 hour
    3 * 60 * 60 * 1000,          // Second block: 3 hours
    12 * 60 * 60 * 1000,         // Third block: 12 hours
    24 * 60 * 60 * 1000,         // Fourth block: 24 hours
    7 * 24 * 60 * 60 * 1000,     // Fifth+ block: 7 days
  ]
}

// In-memory store for failed attempts (in production, use Redis or database)
// Map: email -> FailedAttempt
const failedLoginAttempts = new Map<string, FailedAttempt>();

// Track suspicious IPs (multiple failed logins across different accounts)
// Map: ip -> { count, timestamp, locked, lockExpires, blockCount }
const suspiciousIPs = new Map<string, { 
  count: number, 
  since: number, 
  locked: boolean, 
  lockExpires: number | null,
  blockCount: number 
}>();

/**
 * Get the appropriate lockout duration based on consecutive lockout count
 */
function getLockoutDuration(consecutiveLockouts: number): number {
  const index = Math.min(consecutiveLockouts, LOGIN_SECURITY.LOCKOUT_DURATIONS.length - 1);
  return LOGIN_SECURITY.LOCKOUT_DURATIONS[index];
}

/**
 * Get the appropriate IP block duration based on block count
 */
function getIpBlockDuration(blockCount: number): number {
  const index = Math.min(blockCount, LOGIN_SECURITY.IP_BLOCK_DURATIONS.length - 1);
  return LOGIN_SECURITY.IP_BLOCK_DURATIONS[index];
}

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
    // Note: we don't reset consecutiveLockouts because we want to track historical lockouts
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
    // Note: we don't reset blockCount because we want to track historical blocks
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
      lockExpires: null,
      consecutiveLockouts: 0
    });
  } else {
    // Reset count if window has passed
    if (now - attempts.firstAttempt > LOGIN_SECURITY.ATTEMPT_WINDOW) {
      failedLoginAttempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
        locked: false,
        lockExpires: null,
        consecutiveLockouts: attempts.consecutiveLockouts // Preserve lockout history
      });
    } else {
      // Increment counter and update timestamps
      attempts.count += 1;
      attempts.lastAttempt = now;
      
      // Lock account if too many attempts
      if (attempts.count >= LOGIN_SECURITY.MAX_ATTEMPTS) {
        attempts.locked = true;
        attempts.lockExpires = now + getLockoutDuration(attempts.consecutiveLockouts);
        attempts.consecutiveLockouts += 1;
        
        // Log security event for account lockout - mask identifier for privacy
        const maskedIdentifier = maskIdentifier(identifier);
        logSecurityEvent(
          'account_lockout',
          { 
            identifier: maskedIdentifier,
            ip: ip || 'unknown',
            attempts: attempts.count,
            lockDuration: getLockoutDuration(attempts.consecutiveLockouts - 1) / 60000 // Convert to minutes
          },
          'high'
        );
      }
      
      failedLoginAttempts.set(identifier, attempts);
    }
  }
  
  // Track for IP-based blocking (if IP is provided)
  if (ip) {
    const ipData = suspiciousIPs.get(ip) || { count: 0, since: now, locked: false, lockExpires: null, blockCount: 0 };
    
    // Reset if older than window
    if (now - ipData.since > LOGIN_SECURITY.ATTEMPT_WINDOW) {
      ipData.count = 1;
      ipData.since = now;
      ipData.locked = false;
      ipData.lockExpires = null;
      // Note: we don't reset blockCount to maintain history of blocks
    } else {
      ipData.count += 1;
      
      // If IP has too many attempts across different accounts, block it
      if (ipData.count >= LOGIN_SECURITY.SUSPICIOUS_IP_THRESHOLD) {
        ipData.locked = true;
        ipData.lockExpires = now + getIpBlockDuration(ipData.blockCount);
        
        logSecurityEvent(
          'ip_blocked',
          { 
            ip,
            attempts: ipData.count,
            lockDuration: getIpBlockDuration(ipData.blockCount) / 3600000 // Convert to hours
          },
          'critical'
        );
        
        ipData.blockCount += 1; // Increment after using to calculate the current duration
      }
    }
    
    suspiciousIPs.set(ip, ipData);
  }
}

/**
 * Helper function to mask email addresses or other identifiers for privacy in logs
 * Preserves first 2 and last 2 characters of username part, and full domain
 */
function maskIdentifier(identifier: string): string {
  // Check if it's likely an email address
  if (identifier.includes('@')) {
    const [username, domain] = identifier.split('@');
    
    if (username.length <= 4) {
      // Very short usernames just show first character
      return `${username.charAt(0)}***@${domain}`;
    } else {
      // Longer usernames show first 2 and last 2 chars
      return `${username.slice(0, 2)}***${username.slice(-2)}@${domain}`;
    }
  }
  
  // For non-email identifiers, mask the middle portion
  if (identifier.length <= 4) {
    return identifier.charAt(0) + '***';
  } else {
    return `${identifier.slice(0, 2)}***${identifier.slice(-2)}`;
  }
}

/**
 * Resets failed login attempts on successful login
 */
export function resetFailedLoginAttempts(identifier: string, ip?: string): void {
  // Get current attempts record
  const attempts = failedLoginAttempts.get(identifier);
  
  if (attempts) {
    // Preserve the consecutiveLockouts count but reset the current lock
    failedLoginAttempts.set(identifier, {
      count: 0,
      firstAttempt: Date.now(),
      lastAttempt: Date.now(),
      locked: false,
      lockExpires: null,
      consecutiveLockouts: attempts.consecutiveLockouts
    });
    
    // Log the reset
    logSecurityEvent(
      'login_attempt_reset',
      { 
        email: maskIdentifier(identifier),
        ip: ip || '::1'
      },
      'low'
    );
  } else {
    // Clean up entry completely if it doesn't exist
    failedLoginAttempts.delete(identifier);
  }
  
  // Note: We don't reset IP blocks on successful login
  // This is intentional to prevent attackers from trying different 
  // username/password combinations from the same IP
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
 * For API endpoints that need to log account lock status
 */
export function logAccountLockStatus(identifier: string, ip: string) {
  const status = getAccountStatus(identifier);
  logSecurityEvent(
    'account_lock_status_check',
    {
      email: maskIdentifier(identifier),
      ip,
      isLocked: status.isLocked
    },
    'low'
  );
  return status;
}

/**
 * Cleans up expired locks and old records (maintenance)
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
 * Resets all security data
 * CAUTION: Only use in test environments or during maintenance windows
 */
export function resetAllSecurityData(authToken?: string): boolean {
  // Safety check - this should only run in development or with proper authorization
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    if (!authToken || authToken !== process.env.SECURITY_RESET_TOKEN) {
      logSecurityEvent(
        'unauthorized_security_reset',
        { environment: process.env.NODE_ENV },
        'critical'
      );
      return false;
    }
  }
  
  // Clear all data
  failedLoginAttempts.clear();
  suspiciousIPs.clear();
  
  logSecurityEvent(
    'security_data_reset',
    { environment: process.env.NODE_ENV },
    'high'
  );
  
  return true;
}

/**
 * Clears the future-dated test log entries that were 
 * generated during testing. This should be run before
 * moving to production.
 */
export function clearTestLogEntries(): void {
  if (process.env.NODE_ENV === 'production') {
    // This should not run in production
    return;
  }
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Only attempt if filesystem is available
    if (!fs.existsSync(path.join(process.cwd(), 'logs'))) {
      return;
    }
    
    const securityLog = path.join(process.cwd(), 'logs', 'security.log');
    const criticalLog = path.join(process.cwd(), 'logs', 'critical-security.log');
    
    // Clear the old log files
    if (fs.existsSync(securityLog)) {
      fs.writeFileSync(securityLog, '');
    }
    
    if (fs.existsSync(criticalLog)) {
      fs.writeFileSync(criticalLog, '');
    }
    
    // Log the cleanup action
    logSecurityEvent(
      'test_logs_cleared',
      { timestamp: new Date().toISOString() },
      'medium'
    );
  } catch (error) {
    console.error('Failed to clear test logs:', error);
  }
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