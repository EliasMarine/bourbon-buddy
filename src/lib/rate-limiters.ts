import rateLimit from 'express-rate-limit';
import { NextResponse } from 'next/server';

export function createRateLimiter({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 100 // limit each IP to 100 requests per windowMs
} = {}) {
  const limiter = rateLimit({
    windowMs,
    max,
    message: { error: 'Too many requests, please try again later.' },
    handler: (_, __, ___, options) => {
      return NextResponse.json(
        options.message,
        { status: 429 }
      );
    },
  });

  return limiter;
}

// Collection rate limiters
export const collectionGetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const collectionPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Individual spirit rate limiters
export const spiritGetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const spiritUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const spiritDeleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
}); 