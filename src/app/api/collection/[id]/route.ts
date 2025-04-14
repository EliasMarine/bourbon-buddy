import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabase-auth';
import { PrismaClient } from '@prisma/client';
import { SpiritSchema } from '@/lib/validations/spirit';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';

// GET /api/collection/[id] - Get specific spirit
export async function GET(request: NextRequest) {
  try {
    // Get the ID from the URL
    const id = request.nextUrl.pathname.split('/').pop();
    
    // Get user from request
    const user = await getUserFromRequest(request);

    if (!user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use standard query now that the webImageUrl column issue is fixed
    const spirit = await prisma.spirit.findUnique({
      where: { id },
    });

    if (!spirit) {
      return NextResponse.json(
        { error: 'Spirit not found' },
        { status: 404 }
      );
    }

    // Format tasting notes to ensure consistent representation
    const formattedSpirit = {
      ...spirit,
      nose: formatTastingNotes(spirit.nose),
      palate: formatTastingNotes(spirit.palate),
      finish: formatTastingNotes(spirit.finish),
    };

    // Add cache control headers to prevent frequent re-fetching
    const headers = new Headers();
    headers.set('Cache-Control', 'private, max-age=10');
    headers.set('Vary', 'Cookie, Authorization');

    return NextResponse.json(formattedSpirit, { headers });
  } catch (error: unknown) {
    console.error('Spirit GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to format tasting notes consistently
function formatTastingNotes(notes: string | null | undefined | string[] | any): string {
  // Handle null or undefined
  if (notes === null || notes === undefined || notes === 'null' || notes === '') return '[]';
  
  try {
    // Handle case when notes is already an array
    if (Array.isArray(notes)) {
      // Filter out null/undefined/empty values and stringify
      const filteredArray = notes.filter(note => 
        note !== null && note !== undefined && note !== 'null' && note !== ''
      );
      return JSON.stringify(filteredArray);
    }
    
    // If it's already a valid JSON array string, validate and return it
    if (typeof notes === 'string' && notes.startsWith('[') && notes.endsWith(']')) {
      try {
        // Parse and re-stringify to ensure valid format
        const parsed = JSON.parse(notes);
        if (Array.isArray(parsed)) {
          const filteredArray = parsed.filter(note => 
            note !== null && note !== undefined && note !== 'null' && note !== ''
          );
          return JSON.stringify(filteredArray);
        }
        // If parsed but not an array, wrap in array
        return JSON.stringify([notes]);
      } catch (e) {
        // Invalid JSON but looks like an array, return empty array
        console.warn('Invalid JSON array string:', notes);
        return '[]';
      }
    }
    
    // If it's a comma-separated string, convert to JSON array
    if (typeof notes === 'string' && notes.includes(',')) {
      const notesArray = notes.split(',')
        .map(n => n && typeof n.trim === 'function' ? n.trim() : n)
        .filter(n => n !== null && n !== undefined && n !== 'null' && n !== '');
      return JSON.stringify(notesArray);
    }
    
    // Single note (and not an empty string), convert to JSON array
    if (notes !== '') {
      return JSON.stringify([notes]);
    }
    
    // Default to empty array
    return '[]';
  } catch (e) {
    console.error('Error formatting tasting notes:', e, notes);
    // If any error occurs, return a valid empty JSON array
    return '[]';
  }
}

// PUT /api/collection/[id] - Update spirit
export async function PUT(request: NextRequest) {
  try {
    // Get the ID from the URL
    const id = request.nextUrl.pathname.split('/').pop();
    
    // Get user from request
    const user = await getUserFromRequest(request);

    console.log(`Attempting to update spirit with ID: ${id}`);
    
    if (!user?.email) {
      console.log('Update failed: User not authenticated');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('Received update data:', body);
    
    // Validate input data
    try {
      // Remove any properties that shouldn't be updated by the client
      const { ownerId, ...validatableData } = body;
      
      const validatedData = SpiritSchema.parse(validatableData);
      console.log('Validated data:', validatedData);

      // Check if spirit exists and belongs to user
      const existingSpirit = await prisma.spirit.findFirst({
        where: {
          id,
          owner: {
            email: user.email
          }
        },
        include: {
          owner: true
        }
      });

      if (!existingSpirit) {
        console.log(`Spirit not found or does not belong to user: ${user.email}`);
        
        // Check if spirit exists at all (for clearer error message)
        const anySpirit = await prisma.spirit.findUnique({
          where: { id },
          include: { owner: { select: { email: true } } }
        });
        
        if (anySpirit) {
          console.log(`Spirit exists but belongs to: ${anySpirit.owner?.email}`);
          return NextResponse.json(
            { error: 'You do not have permission to update this spirit' },
            { status: 403 }
          );
        } else {
          return NextResponse.json(
            { error: 'Spirit not found' },
            { status: 404 }
          );
        }
      }

      // Prepare update data
      let updateData: any = {
        name: validatedData.name,
        brand: validatedData.brand,
        category: validatedData.category,
        type: validatedData.type,
        description: validatedData.description,
        proof: validatedData.proof,
        price: validatedData.price,
        imageUrl: validatedData.imageUrl,
        webImageUrl: validatedData.webImageUrl,
        bottleLevel: validatedData.bottleLevel,
        rating: validatedData.rating,
        // Ensure tasting notes are always stored as strings
        nose: typeof validatedData.nose === 'string' ? validatedData.nose : JSON.stringify(validatedData.nose),
        palate: typeof validatedData.palate === 'string' ? validatedData.palate : JSON.stringify(validatedData.palate),
        finish: typeof validatedData.finish === 'string' ? validatedData.finish : JSON.stringify(validatedData.finish),
        distillery: validatedData.distillery,
        bottleSize: validatedData.bottleSize,
        dateAcquired: validatedData.dateAcquired,
        isFavorite: validatedData.isFavorite,
        // Use connect to link to the existing owner
        owner: {
          connect: {
            id: existingSpirit.ownerId
          }
        }
      };
      
      // Update the spirit but make sure to retain the original owner
      const spirit = await prisma.spirit.update({
        where: { id },
        data: updateData,
      });

      console.log('Spirit updated successfully:', spirit.id);
      return NextResponse.json(spirit);
    } catch (e) {
      if (e instanceof ZodError) {
        console.error('Validation error:', e.errors);
        return NextResponse.json(
          { 
            error: 'Validation error',
            details: e.errors 
          },
          { status: 400 }
        );
      }
      throw e; // Re-throw if not a ZodError
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // Check for Prisma database column error
    if (error && 
        typeof error === 'object' && 
        'code' in error && 
        error.code === 'P2022') {
      console.error('Database column error (likely webImageUrl missing):', error);
      return NextResponse.json(
        { 
          error: 'Database schema mismatch', 
          details: 'The webImageUrl field is not yet available in the database. Please apply the migration.'
        },
        { status: 500 }
      );
    }
    
    console.error('Spirit PUT error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/collection/[id] - Delete spirit
export async function DELETE(request: NextRequest) {
  try {
    // Get the ID from the URL
    const id = request.nextUrl.pathname.split('/').pop();
    
    // Get user from request
    const user = await getUserFromRequest(request);
    
    console.log(`Received DELETE request for spirit ID: ${id}`);
    console.log('Session user:', user);

    if (!user?.email) {
      console.log('Unauthorized: No user in session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if spirit exists and belongs to user
    console.log(`Looking for spirit with ID: ${id} owned by: ${user.email}`);
    const existingSpirit = await prisma.spirit.findFirst({
      where: {
        id,
        owner: {
          email: user.email
        }
      },
      include: {
        reviews: true // Include related data for backup
      }
    });

    if (!existingSpirit) {
      console.log('Spirit not found or unauthorized');
      // Try finding the spirit without user constraint to see if it exists at all
      const anySpirit = await prisma.spirit.findUnique({
        where: { id },
        include: { owner: true }
      });
      
      if (anySpirit) {
        console.log(`Spirit exists but belongs to: ${anySpirit.owner?.email}`);
      } else {
        console.log('Spirit does not exist with this ID');
      }
      
      return NextResponse.json(
        { error: 'Spirit not found or unauthorized' },
        { status: 404 }
      );
    }

    // Create a backup of the spirit data in case we need to recover it
    // In production, you would store this backup in a more persistent storage
    // This approach ensures we have a copy of the data even without schema changes
    const spiritBackup = { 
      ...existingSpirit,
      deletedAt: new Date(),
      _backupId: `${existingSpirit.id}_${Date.now()}`
    };
    
    // Store backup
    try {
      // Option 1: Store in a backups table if you add one later
      // await prisma.spiritBackup.create({ data: spiritBackup }); 
      
      // Option 2: Log to console (simple approach for now)
      console.log('Spirit backup created:', JSON.stringify(spiritBackup));
      
      // Option 3: In production, consider storing to a backup DB collection or file
    } catch (backupError) {
      console.error('Backup creation failed, aborting delete operation:', backupError);
      return NextResponse.json(
        { error: 'Delete operation failed - backup creation error' },
        { status: 500 }
      );
    }

    console.log(`Deleting spirit: ${existingSpirit.name} (${existingSpirit.id})`);
    const spirit = await prisma.spirit.delete({
      where: { id },
    });

    console.log('Spirit deleted successfully');
    return NextResponse.json({ 
      success: true,
      message: 'Spirit deleted successfully',
      deletedSpirit: spirit
    });
  } catch (error) {
    console.error('Spirit DELETE error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH /api/collection/[id] - Update favorite status
export async function PATCH(request: NextRequest) {
  try {
    // Get the ID from the URL
    const id = request.nextUrl.pathname.split('/').pop();
    
    // Get user from request
    const user = await getUserFromRequest(request);
    
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Only allow updating the isFavorite field with this endpoint
    const { isFavorite } = body;
    
    if (typeof isFavorite !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: isFavorite must be a boolean' },
        { status: 400 }
      );
    }

    // Check if spirit exists and belongs to user
    const existingSpirit = await prisma.spirit.findFirst({
      where: {
        id,
        owner: {
          email: user.email
        }
      }
    });

    if (!existingSpirit) {
      return NextResponse.json(
        { error: 'Spirit not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update only the isFavorite field
    const spirit = await prisma.spirit.update({
      where: { id },
      data: { isFavorite },
    });

    return NextResponse.json({ 
      success: true, 
      message: `Spirit ${isFavorite ? 'added to' : 'removed from'} favorites`,
      spirit
    });
  } catch (error: unknown) {
    console.error('Spirit PATCH error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 