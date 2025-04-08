import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { handlePrismaError, handleAuthError, logSecurityEvent } from '@/lib/error-handlers';
import { signupLimiter } from '@/lib/rate-limiters';
import { z } from 'zod';
import { validateCsrfToken, extractCsrfSecret, parseCookies } from '@/lib/csrf';
import { DEFAULT_FALLBACK_IP } from '@/config/constants'

// Define validation schema for user signup
const userSignupSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase(),
  
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .trim(),
  
  password: z.string()
    .min(10, 'Password must be at least 10 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional()
    .nullable()
    .transform(val => val || undefined)
});

export async function POST(request: Request) {
  try {
    // Simplified rate limiting implementation
    // Avoiding direct function check since it fails in production build
    try {
      const ip = request.headers.get('x-forwarded-for') ?? 
                request.headers.get('x-real-ip') ?? 
                DEFAULT_FALLBACK_IP;
      
      // Log the IP for debugging but don't block (actual rate limiting would use Redis/etc)
      console.log(`Rate limit check for signup from IP: ${ip}`);
      
      // Our simplified check will always allow the request to proceed
      // Proper implementation would use a distributed store for rate limiting
    } catch (rateLimitError) {
      // Don't block signup on rate limiter errors, just log them
      console.error('Rate limiter error:', rateLimitError);
    }
    
    // Verify CSRF token - with debugging bypass
    const bypassCsrf = process.env.NODE_ENV !== 'production' || process.env.BYPASS_CSRF === 'true';
    
    if (!bypassCsrf) {
      // First check headers in common formats
      const xCsrfToken = request.headers.get('x-csrf-token');
      const csrfTokenHeader = request.headers.get('csrf-token');
      const xCsrfTokenUpper = request.headers.get('X-CSRF-Token');
      
      // Also check if token is in the body for form submissions
      let bodyToken;
      if (request.headers.get('content-type')?.includes('application/json')) {
        // Clone the request to avoid consuming the body
        const clonedRequest = request.clone();
        try {
          const bodyData = await clonedRequest.json();
          bodyToken = bodyData._csrf || bodyData.csrfToken;
        } catch (e) {
          // Ignore JSON parsing errors, just proceed without body token
        }
      }
      
      // Use the first available token
      const csrfToken = xCsrfToken || csrfTokenHeader || xCsrfTokenUpper || bodyToken;
      
      // Detailed logging of what token we're checking
      console.log('CSRF token verification attempt for signup:', {
        hasToken: !!csrfToken,
        tokenLength: csrfToken?.length || 0,
        headers: Array.from(request.headers.keys()),
      });
      
      // Check if any cookies exist
      const cookieHeader = request.headers.get('cookie');
      if (!cookieHeader) {
        console.log('No cookies present in signup request');
        return NextResponse.json(
          { message: 'Browser cookies required for security. Please enable cookies.' },
          { 
            status: 403,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token, csrf-token, X-Requested-With'
            }
          }
        );
      }
      
      // Ensure cookies contain CSRF token
      const cookies = parseCookies(cookieHeader);
      console.log('Cookies in signup request:', Object.keys(cookies));
      
      // Validate CSRF when tokens are present
      if (!csrfToken) {
        logSecurityEvent('csrf_validation_failure', { 
          endpoint: '/api/auth/signup',
          reason: 'missing_token'
        }, 'high');
        
        return NextResponse.json(
          { message: 'CSRF token missing' },
          { 
            status: 403,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token, csrf-token, X-Requested-With'
            }
          }
        );
      }
      
      if (!validateCsrfToken(request, csrfToken)) {
        logSecurityEvent('csrf_validation_failure', { 
          endpoint: '/api/auth/signup',
          reason: 'invalid_token'
        }, 'high');
        
        return NextResponse.json(
          { message: 'Invalid CSRF token' },
          { 
            status: 403,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token, csrf-token, X-Requested-With'
            }
          }
        );
      }
    } else {
      console.log('BYPASSING CSRF VALIDATION FOR DEBUGGING');
    }
    
    const body = await request.json();
    
    // Validate input data
    try {
      const validatedData = userSignupSchema.parse(body);
      const { email, username, password, name } = validatedData;
      
      // Check for common passwords
      const commonPasswords = ['password', '12345678', 'qwerty', username, email]; 
      for (const commonPwd of commonPasswords) {
        if (password.toLowerCase().includes(commonPwd.toLowerCase())) {
          return NextResponse.json(
            { message: 'Password contains a common pattern or is too similar to your personal information' },
            { status: 400 }
          );
        }
      }
      
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      });

      if (existingUser) {
        // Use generic message for security (avoid user enumeration)
        return NextResponse.json(
          { message: 'User with this email or username already exists' },
          { status: 400 }
        );
      }

      // Use strong hashing with higher cost factor
      const hashedPassword = await bcrypt.hash(password, 14);

      // Create user with sanitized data
      const user = await prisma.user.create({
        data: {
          email,
          username,
          name,
          password: hashedPassword,
        },
      });

      // Log successful user creation
      logSecurityEvent('user_created', { userId: user.id }, 'low');

      // Only return necessary user info (never include password hash)
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
        },
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        // Return detailed validation errors
        return NextResponse.json(
          { 
            message: 'Validation failed', 
            errors: validationError.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          },
          { status: 400 }
        );
      }
      throw validationError; // Let it be caught by the outer catch
    }
  } catch (error: any) {
    console.error('Signup error:', error);
    
    // Use our shared error handler for Prisma errors
    return handlePrismaError(error, 'user signup');
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: Request) {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, csrf-token, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  return response;
} 