import { PrismaClientInitializationError, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NextResponse } from 'next/server';

/**
 * Handles Prisma database errors safely for API responses
 * Prevents sensitive information from being exposed to clients
 */
export function handlePrismaError(error: unknown, context = 'operation') {
  // Log the full error internally for debugging
  console.error(`Prisma error in ${context}:`, error);

  // Provide sanitized error messages for client
  if (error instanceof PrismaClientInitializationError) {
    return NextResponse.json(
      { message: 'Database connection error. Please try again later.' },
      { status: 503 } // Service Unavailable
    );
  } 
  
  if (error instanceof PrismaClientKnownRequestError) {
    // Handle common Prisma error codes
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return NextResponse.json(
          { message: 'Resource already exists with these details.' },
          { status: 400 }
        );
      case 'P2025': // Record not found
        return NextResponse.json(
          { message: 'Resource not found.' },
          { status: 404 }
        );
      default:
        return NextResponse.json(
          { message: 'Database error occurred. Please try again later.' },
          { status: 500 }
        );
    }
  }

  // Handle any other types of errors with a generic message
  return NextResponse.json(
    { message: 'An unexpected error occurred. Please try again later.' },
    { status: 500 }
  );
}

/**
 * Safe error message for authentication errors
 * To be used with NextAuth and auth-related routes
 */
export function handleAuthError(error: unknown) {
  console.error('Authentication error:', error);
  
  if (error instanceof Error) {
    // Only expose specific validation errors that are safe
    const safeErrors = [
      'Please enter an email and password',
      'Invalid email or password',
      'This username or email is already taken',
      'User with this email or username already exists'
    ];
    
    if (safeErrors.includes(error.message)) {
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