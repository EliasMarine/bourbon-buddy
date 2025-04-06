import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma'; // Use shared prisma client
import { SpiritSchema } from '@/lib/validations/spirit';
import spiritCategories from '@/lib/spiritCategories';
import { ZodError } from 'zod';
import { collectionGetLimiter, collectionPostLimiter } from '@/lib/rate-limiters';

// GET /api/collection - Get user's collection
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { spirits: true },
    });

    return NextResponse.json({ spirits: user?.spirits || [] });
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
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - No user email in session' },
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
      
      // Look up the user by email
      let user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      // If user doesn't exist, create a new one with the session data
      if (!user && session.user.email) {
        try {
          user = await prisma.user.create({
            data: {
              email: session.user.email,
              name: session.user.name || 'New User',
              // Only include ID if provided by session
              ...(session.user.id ? { id: session.user.id } : {}),
              username: session.user.email.split('@')[0], // Generate username from email
              password: '', // Add empty password
            },
          });
        } catch (createError) {
          // Try a simpler approach without ID
          user = await prisma.user.create({
            data: {
              email: session.user.email,
              name: session.user.name || 'New User',
              username: session.user.email.split('@')[0],
              password: '',
            },
          });
        }
      }

      if (!user) {
        return NextResponse.json(
          { error: 'Unable to find or create user account' },
          { status: 500 }
        );
      }

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
        ownerId: user.id // Use ownerId instead of userId to match Prisma schema
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