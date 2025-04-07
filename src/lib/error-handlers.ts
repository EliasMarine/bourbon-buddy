import { PrismaClientInitializationError, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Create a logs directory if it doesn't exist
try {
  if (!fs.existsSync(path.join(process.cwd(), 'logs'))) {
    fs.mkdirSync(path.join(process.cwd(), 'logs'));
  }
} catch (error) {
  console.error('Error initializing log directory:', error);
}

/**
 * Logs security events to both console and file
 */
export function logSecurityEvent(eventType: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium', userId?: string) {
  const timestamp = new Date().toISOString();
  
  // Format log entry
  const logEntry = JSON.stringify({
    timestamp,
    type: eventType,
    severity,
    userId: userId || 'unknown',
    details,
    environment: process.env.NODE_ENV || 'development'
  });
  
  // Console log with severity-based formatting
  const severityColors = {
    low: '\x1b[34m', // blue
    medium: '\x1b[33m', // yellow
    high: '\x1b[31m', // red
    critical: '\x1b[41m\x1b[37m', // white on red background
  };
  
  console.log(`${severityColors[severity]}[SECURITY ${severity.toUpperCase()}]\x1b[0m ${timestamp} - ${eventType} - ${JSON.stringify(details)}`);
  
  // Log to file
  try {
    const logFile = path.join(process.cwd(), 'logs', 'security.log');
    fs.appendFileSync(logFile, logEntry + '\n');
    
    // For critical events, also write to a separate file
    if (severity === 'critical') {
      const criticalLogFile = path.join(process.cwd(), 'logs', 'critical-security.log');
      fs.appendFileSync(criticalLogFile, logEntry + '\n');
    }
  } catch (error) {
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
  if (error instanceof PrismaClientInitializationError) {
    logSecurityEvent('database_connection_error', { context, errorType: 'initialization' }, 'high');
    
    return NextResponse.json(
      { message: 'Database connection error. Please try again later.' },
      { status: 503 } // Service Unavailable
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
export function handleAuthError(error: unknown, userId?: string) {
  // Log authentication errors
  const errorDetails = error instanceof Error 
    ? { message: error.message, name: error.name, stack: error.stack } 
    : { error };
  
  logSecurityEvent('auth_error', errorDetails, 'high', userId);
  
  if (error instanceof Error) {
    // Only expose specific validation errors that are safe
    const safeErrors = [
      'Please enter an email and password',
      'Invalid email or password',
      'This username or email is already taken',
      'User with this email or username already exists',
      'Your account has been locked due to multiple failed attempts'
    ];
    
    if (safeErrors.includes(error.message)) {
      // For invalid login attempts, log as potential security threat
      if (error.message === 'Invalid email or password') {
        logSecurityEvent('failed_login_attempt', { message: error.message }, 'medium', userId);
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