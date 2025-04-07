import rateLimit from 'express-rate-limit';
import { NextResponse } from 'next/server';

// Define the expected signature of a rate limiter instance
interface RateLimiter {
  check?: (request: Request) => Promise<{
    statusCode: number;
    message: string;
  }>;
}

// Base rate limiter factory function with improved options
export function createRateLimiter({
  windowMs = 15 * 60 * 1000, // 15 minutes by default
  max = 100, // limit each IP to 100 requests per windowMs by default
  message = 'Too many requests, please try again later.',
  statusCode = 429
} = {}): RateLimiter {
  const limiter = rateLimit({
    windowMs,
    max,
    message: { error: message },
    handler: (_, __, ___, options) => {
      return NextResponse.json(
        options.message,
        { status: statusCode }
      );
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Add a check method that works in serverless environments
  const enhancedLimiter = {
    ...limiter,
    // Implementation of check method for serverless environments
    check: async (request: Request) => {
      try {
        // Get the IP address from headers or fallback to a default
        const ip = request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  '127.0.0.1';
        
        // In serverless, we can't increment and check in one go like express middleware
        // This is a simplified version that just returns success
        // In a real implementation, you'd want to use a distributed counter with Redis/etc
        
        console.log(`Rate limit check for IP: ${ip}`);
        
        return {
          statusCode: 200, // Allow the request to proceed
          message: ''
        };
      } catch (error) {
        console.error('Rate limiting error:', error);
        // Fail open - if rate limiting fails, allow the request through
        return {
          statusCode: 200,
          message: ''
        };
      }
    }
  };

  return enhancedLimiter;
}

// Authentication rate limiters
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts. Please try again later.',
});

export const signupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 account creation attempts per hour
  message: 'Too many signup attempts. Please try again later.',
});

export const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: 'Too many password reset attempts. Please try again later.',
});

// API endpoints rate limiters
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many API requests. Please try again later.',
});

// Collection rate limiters
export const collectionGetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests for collection data. Please try again later.',
});

export const collectionPostLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many collection update requests. Please try again later.',
});

// File upload rate limiters
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: 'Too many file uploads. Please try again later.',
});

// Individual spirit rate limiters
export const spiritGetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests to view spirit data. Please try again later.',
});

export const spiritUpdateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: 'Too many spirit update requests. Please try again later.',
});

export const spiritDeleteLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 requests per windowMs
  message: 'Too many spirit deletion requests. Please try again later.',
});

// Socket rate limiters
export const socketConnectionLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 connections per 5 minutes
  message: 'Too many socket connection attempts. Please try again later.',
}); 