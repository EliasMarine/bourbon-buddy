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