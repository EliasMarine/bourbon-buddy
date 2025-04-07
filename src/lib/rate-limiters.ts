import rateLimit from 'express-rate-limit';
import { NextResponse } from 'next/server';

// Base rate limiter factory function with improved options
export function createRateLimiter({
  windowMs = 15 * 60 * 1000, // 15 minutes by default
  max = 100, // limit each IP to 100 requests per windowMs by default
  message = 'Too many requests, please try again later.',
  statusCode = 429
} = {}) {
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

  return limiter;
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