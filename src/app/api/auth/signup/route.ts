import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { handlePrismaError, handleAuthError } from '@/lib/error-handlers';
import { signupLimiter } from '@/lib/rate-limiters';
import { z } from 'zod';
import { validateCsrfToken } from '@/lib/csrf';

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
    // Apply rate limiting
    const limiterResponse = await signupLimiter.check(request);
    if (limiterResponse.statusCode === 429) {
      return NextResponse.json(
        { message: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Verify CSRF token
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken || !validateCsrfToken(request, csrfToken)) {
      return NextResponse.json(
        { message: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
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