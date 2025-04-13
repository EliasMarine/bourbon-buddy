import { PrismaClientInitializationError, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Environment variables for logging config
const LOG_TO_FILE = process.env.LOG_TO_FILE !== 'false';
const LOG_TO_CONSOLE = process.env.LOG_TO_CONSOLE !== 'false';
const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Create a logs directory if it doesn't exist (skip in serverless environments)
if (!IS_SERVERLESS && LOG_TO_FILE) {
  try {
    if (!fs.existsSync(path.join(process.cwd(), 'logs'))) {
      fs.mkdirSync(path.join(process.cwd(), 'logs'));
    }
  } catch (error) {
    console.error('Error initializing log directory:', error);
  }
}

/**
 * Helper function to sanitize potentially sensitive data from logs
 */
function sanitizeForLogs(data: any): any {
  if (!data) return data;
  
  // Handle different types appropriately
  if (typeof data !== 'object') return data;
  
  // Clone to avoid mutating the original object
  const sanitized = Array.isArray(data) ? [...data] : {...data};
  
  // Fields that should be completely masked
  const sensitiveFields = [
    'password', 'passwordHash', 'secret', 'token', 'accessToken', 'refreshToken',
    'apiKey', 'key', 'credentials', 'pin', 'ssn', 'creditCard'
  ];
  
  // Fields that should be partially masked (like emails, names)
  const partialMaskFields = [
    'email', 'identifier', 'username', 'name', 'firstName', 'lastName',
    'address', 'phone', 'mobile'
  ];
  
  // Process all properties
  for (const key in sanitized) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      // Completely mask sensitive values
      sanitized[key] = '********';
    } else if (partialMaskFields.includes(key.toLowerCase())) {
      // Partially mask PII
      if (typeof sanitized[key] === 'string') {
        const value = sanitized[key];
        
        // Handle email addresses specially
        if (key.toLowerCase() === 'email' || (typeof value === 'string' && value.includes('@'))) {
          const [username, domain] = value.split('@');
          if (username.length <= 4) {
            sanitized[key] = `${username.charAt(0)}***@${domain}`;
          } else {
            sanitized[key] = `${username.slice(0, 2)}***${username.slice(-2)}@${domain}`;
          }
        } else if (value.length <= 4) {
          // Short values
          sanitized[key] = `${value.charAt(0)}***`;
        } else {
          // Longer values
          sanitized[key] = `${value.slice(0, 2)}***${value.slice(-2)}`;
        }
      }
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeForLogs(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Logs security events to console and/or file based on environment
 */
export function logSecurityEvent(eventType: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium', userId?: string) {
  const timestamp = new Date().toISOString();
  
  // Sanitize sensitive information from details
  const sanitizedDetails = sanitizeForLogs(details);
  
  // Format log entry
  const logEntry = JSON.stringify({
    timestamp,
    type: eventType,
    severity,
    userId: userId || 'unknown',
    details: sanitizedDetails,
    environment: process.env.NODE_ENV || 'development'
  });
  
  // Console logging (can be disabled with LOG_TO_CONSOLE=false)
  if (LOG_TO_CONSOLE) {
    // Severity-based formatting
    const severityColors = {
      low: '\x1b[34m', // blue
      medium: '\x1b[33m', // yellow
      high: '\x1b[31m', // red
      critical: '\x1b[41m\x1b[37m', // white on red background
    };
    
    console.log(`${severityColors[severity]}[SECURITY ${severity.toUpperCase()}]\x1b[0m ${timestamp} - ${eventType} - ${JSON.stringify(sanitizedDetails)}`);
  }
  
  // Skip file logging in serverless environments or if explicitly disabled
  if (IS_SERVERLESS || !LOG_TO_FILE) {
    return;
  }
  
  // File logging for development environments with writable filesystem
  try {
    const logDir = path.join(process.cwd(), 'logs');
    
    // Test if filesystem is writable
    try {
      const testFile = path.join(logDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (e) {
      // If we can't write, just return silently rather than causing an additional error
      console.warn('Skipping file logging - filesystem appears to be read-only');
      return;
    }
    
    // Write to security log file
    const logFile = path.join(logDir, 'security.log');
    fs.appendFileSync(logFile, logEntry + '\n');
    
    // For critical events, also write to a separate file
    if (severity === 'critical') {
      const criticalLogFile = path.join(logDir, 'critical-security.log');
      fs.appendFileSync(criticalLogFile, logEntry + '\n');
    }
  } catch (error) {
    // Just log the error without throwing to prevent 500 errors
    console.error('Error writing to security log file:', error);
  }
}

/**
 * Handles Prisma database errors safely for API responses
 * Prevents sensitive information from being exposed to clients
 */
export function handlePrismaError(error: unknown, context = 'operation', userId?: string) {
  // Log the full error internally for debugging
  console.error(`Prisma error in ${context}:`, error);

  // Provide sanitized error messages for client
  if (error instanceof PrismaClientInitializationError || 
      (error instanceof Error && 
       (error.message.includes("Can't reach database server") || 
        error.message.includes("Connection refused") || 
        error.message.includes("Connection terminated") ||
        error.message.includes("database connection is currently unavailable")))) {
    
    logSecurityEvent('database_connection_error', { 
      context, 
      errorType: 'initialization',
      message: error instanceof Error ? error.message : 'Unknown connection error'
    }, 'high');
    
    return NextResponse.json(
      { 
        message: 'Database service is temporarily unavailable. Please try again later.',
        isDbConnectionIssue: true,
        retryAfter: 60, // Suggest retry after 60 seconds
      },
      { 
        status: 503, // Service Unavailable
        headers: {
          'Retry-After': '60',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } 
  
  if (error instanceof PrismaClientKnownRequestError) {
    // Handle common Prisma error codes
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        logSecurityEvent('database_constraint_violation', { context, errorCode: error.code, meta: error.meta }, 'low', userId);
        return NextResponse.json(
          { message: 'Resource already exists with these details.' },
          { status: 400 }
        );
      case 'P2025': // Record not found
        logSecurityEvent('resource_not_found', { context, errorCode: error.code }, 'low', userId);
        return NextResponse.json(
          { message: 'Resource not found.' },
          { status: 404 }
        );
      case 'P2004': // Constraint violation
      case 'P2012': // Missing required value
        logSecurityEvent('data_validation_error', { context, errorCode: error.code, meta: error.meta }, 'medium', userId);
        return NextResponse.json(
          { message: 'Invalid data format. Please check your input.' },
          { status: 400 }
        );
      default:
        logSecurityEvent('database_error', { context, errorCode: error.code, meta: error.meta }, 'medium', userId);
        return NextResponse.json(
          { message: 'Database error occurred. Please try again later.' },
          { status: 500 }
        );
    }
  }

  // Handle any other types of errors with a generic message
  logSecurityEvent('unexpected_error', { context, errorType: error instanceof Error ? error.constructor.name : typeof error }, 'high', userId);
  
  return NextResponse.json(
    { message: 'An unexpected error occurred. Please try again later.' },
    { status: 500 }
  );
}

/**
 * Safe error message for authentication errors
 * To be used with NextAuth and auth-related routes
 */
export function handleAuthError(error: unknown, userId?: string, identifierHint?: string) {
  // Safely serialize error details
  let errorDetails: Record<string, any> = error instanceof Error 
    ? { message: error.message, name: error.name, stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined } 
    : { error: String(error) };
  
  // Include masked identifier if provided, for better tracking of login attempts
  if (identifierHint) {
    // Use sanitizeForLogs to mask the identifier
    errorDetails.identifier = sanitizeForLogs({ identifier: identifierHint }).identifier;
  }
  
  logSecurityEvent('auth_error', errorDetails, 'high', userId);
  
  if (error instanceof Error) {
    // Only expose specific validation errors that are safe
    const safeErrors = [
      'Please enter an email and password',
      'Invalid email or password',
      'This username or email is already taken',
      'User with this email or username already exists',
      'Your account has been locked due to multiple failed attempts',
      'Too many requests, please try again later'
    ];
    
    // Safe error messages that should be shown directly to users
    const isSafeError = safeErrors.some(safeMsg => 
      error.message.includes(safeMsg) || error.message === safeMsg
    );
    
    if (isSafeError) {
      // For invalid login attempts, log as potential security threat
      if (error.message.includes('Invalid email or password')) {
        logSecurityEvent('failed_login_attempt', { 
          message: error.message,
          identifier: identifierHint ? sanitizeForLogs({ identifier: identifierHint }).identifier : undefined
        }, 'medium', userId);
      }
      
      // For lockout messages
      if (error.message.includes('account has been locked') || error.message.includes('Too many requests')) {
        return NextResponse.json(
          { message: error.message },
          { 
            status: 429, // Too Many Requests
            headers: {
              'Retry-After': '900', // 15 min in seconds
            }
          }
        );
      }
      
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
  }
  
  // Generic auth error
  return NextResponse.json(
    { message: 'Authentication failed. Please try again later.' },
    { status: 401 }
  );
}

/**
 * Logs potentially malicious activity and returns a standardized response
 */
export function handleSuspiciousActivity(activityType: string, details: any, userId?: string) {
  logSecurityEvent('suspicious_activity', { activityType, ...details }, 'high', userId);
  
  // For certain high-risk activities, consider blocking the IP or user account
  // This is where you might call a function to add an IP to a blocklist
  
  return NextResponse.json(
    { message: 'Request blocked for security reasons.' },
    { status: 403 }
  );
}

/**
 * Logs and handles CSRF token verification failures
 */
export function handleCsrfFailure(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const url = request.url || 'unknown';
  
  logSecurityEvent('csrf_validation_failure', { ip, userAgent, url }, 'high');
  
  return NextResponse.json(
    { message: 'Invalid security token. Please refresh the page and try again.' },
    { status: 403 }
  );
} 