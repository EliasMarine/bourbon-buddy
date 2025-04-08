import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // Use shared prisma client
import { SpiritSchema } from '@/lib/validations/spirit';
import spiritCategories from '@/lib/spiritCategories';
import { ZodError } from 'zod';
import { collectionGetLimiter, collectionPostLimiter } from '@/lib/rate-limiters';
import { createServerClient } from '@/lib/supabase';
import { validateCsrfToken } from '@/lib/csrf';
import { cookies } from 'next/headers';

// Improved session verification helper
async function verifySession() {
  try {
    // Check NextAuth session
    const nextAuthSession = await getServerSession(authOptions);
    
    // Check Supabase session
    const supabase = createServerClient();
    const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser();
    
    if (supabaseError) {
      console.error('Supabase session error:', supabaseError);
    }
    
    if (!supabaseUser) {
      console.warn('Session verification failed: No Supabase user');
      return { 
        authenticated: false, 
        error: 'Unauthorized - Authentication required', 
        statusCode: 401 
      };
    }
    
    if (!nextAuthSession?.user?.email) {
      console.warn('Session verification failed: No user email in NextAuth session');
      return { 
        authenticated: false, 
        error: 'Unauthorized - No user email in session', 
        statusCode: 401 
      };
    }
    
    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: nextAuthSession.user.email },
    });
    
    // Handle missing user
    if (!user) {
      console.warn(`User not found in database: ${nextAuthSession.user.email}`);
      return { 
        authenticated: false, 
        error: 'User not found in database', 
        statusCode: 401,
        session: nextAuthSession
      };
    }
    
    return { 
      authenticated: true, 
      user,
      session: nextAuthSession,
      supabaseUser
    };
  } catch (error) {
    console.error('Session verification error:', error);
    return { 
      authenticated: false, 
      error: 'Session verification failed', 
      statusCode: 500 
    };
  }
}

// GET /api/collection - Get user's collection
export async function GET(request: Request) {
  try {
    // Verify user session
    const { authenticated, user, error, statusCode, supabaseUser } = await verifySession();
    
    if (!authenticated || !user) {
      console.error('API authentication failed:', error);
      return NextResponse.json(
        { error },
        { status: statusCode }
      );
    }
    
    // Ensure the Supabase user is authenticated
    if (!supabaseUser) {
      console.error('Supabase user not authenticated');
      return NextResponse.json(
        { error: 'Supabase authentication required' },
        { status: 401 }
      );
    }
    
    // Reconnect to database if needed
    const spirits = await prisma.spirit.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ spirits });
  } catch (error) {
    console.error('Collection GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/collection - Add new spirit to collection
export async function POST(request: Request) {
  try {
    // Validate CSRF token first
    const csrfToken = request.headers.get('x-csrf-token');
    
    if (!csrfToken || !validateCsrfToken(request, csrfToken)) {
      console.error('Invalid or missing CSRF token');
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
    }
    
    // Verify user session
    const { authenticated, user, session, error, statusCode, supabaseUser } = await verifySession();
    
    if (!authenticated || !user) {
      console.error(`Session verification failed: ${error}`);
      return NextResponse.json(
        { error },
        { status: statusCode }
      );
    }
    
    // Ensure the Supabase user is authenticated
    if (!supabaseUser) {
      console.error('Supabase user not authenticated');
      return NextResponse.json(
        { error: 'Supabase authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    
    // Convert FormData to an object and handle types properly
    const data: Record<string, any> = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    
    // Parse nose, palate, and finish notes (they're stored as JSON strings)
    if (typeof data.nose === 'string') {
      try {
        data.nose = JSON.parse(data.nose as string);
      } catch (e) {
        // Fallback: store as a single item array if parsing fails
        data.nose = data.nose ? [data.nose] : [];
      }
    }
    
    if (typeof data.palate === 'string') {
      try {
        data.palate = JSON.parse(data.palate as string);
      } catch (e) {
        // Fallback: store as a single item array if parsing fails
        data.palate = data.palate ? [data.palate] : [];
      }
    }
    
    if (typeof data.finish === 'string') {
      try {
        data.finish = JSON.parse(data.finish as string);
      } catch (e) {
        // Fallback: store as a single item array if parsing fails
        data.finish = data.finish ? [data.finish] : [];
      }
    }
    
    // Set types correctly
    const parsedData = {
      name: String(data.name || ''),
      brand: String(data.brand || ''),
      type: String(data.type || ''),
      category: String(data.category || 'whiskey'),
      description: data.description ? String(data.description) : undefined,
      nose: Array.isArray(data.nose) ? data.nose.join(',') : data.nose ? String(data.nose) : undefined,
      palate: Array.isArray(data.palate) ? data.palate.join(',') : data.palate ? String(data.palate) : undefined,
      finish: Array.isArray(data.finish) ? data.finish.join(',') : data.finish ? String(data.finish) : undefined,
      notes: data.notes ? String(data.notes) : undefined,
      imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
      proof: data.proof ? (typeof data.proof === 'string' ? parseFloat(data.proof) : Number(data.proof)) : undefined,
      price: data.price ? (typeof data.price === 'string' ? parseFloat(data.price) : Number(data.price)) : undefined,
      rating: data.rating ? (typeof data.rating === 'string' ? parseFloat(data.rating) : Number(data.rating)) : undefined,
      isFavorite: data.isFavorite === 'true' || data.isFavorite === true,
      age: data.age ? (typeof data.age === 'string' ? parseFloat(data.age) : Number(data.age)) : undefined,
      bottleLevel: data.bottleLevel ? (typeof data.bottleLevel === 'string' ? parseFloat(data.bottleLevel) : Number(data.bottleLevel)) : undefined
    };
    
    // Validate input data using the schema
    try {
      const validatedData = SpiritSchema.parse(parsedData);
      
      // Create the spirit
      const createSpirit = {
        name: validatedData.name,
        brand: validatedData.brand,
        type: validatedData.type,
        category: validatedData.category,
        description: validatedData.description,
        proof: validatedData.proof,
        imageUrl: validatedData.imageUrl,
        notes: validatedData.notes,
        nose: validatedData.nose,
        palate: validatedData.palate,
        finish: validatedData.finish,
        price: validatedData.price,
        rating: validatedData.rating,
        isFavorite: validatedData.isFavorite || false,
        bottleLevel: validatedData.bottleLevel !== undefined ? validatedData.bottleLevel : 100, // Default to full bottle (100)
        ownerId: user.id
      };

      const spirit = await prisma.spirit.create({
        data: createSpirit,
      });

      return NextResponse.json(spirit);
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        return NextResponse.json(
          { 
            error: 'Validation error',
            details: validationError.errors 
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Validation failed', details: validationError instanceof Error ? validationError.message : 'Unknown error' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Collection POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 