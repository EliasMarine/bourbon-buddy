import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { SpiritSchema } from '@/lib/validations/spirit';
import { ZodError } from 'zod';

const prisma = new PrismaClient();

// GET /api/collection/[id] - Get specific spirit
export async function GET(request: NextRequest) {
  try {
    // Get the ID from the URL
    const id = request.nextUrl.pathname.split('/').pop();
    
    // Get user session
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const spirit = await prisma.spirit.findUnique({
      where: { id },
    });

    if (!spirit) {
      return NextResponse.json(
        { error: 'Spirit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(spirit);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    console.error('Spirit GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/collection/[id] - Update spirit
export async function PUT(request: NextRequest) {
  try {
    // Get the ID from the URL
    const id = request.nextUrl.pathname.split('/').pop();
    
    // Get user session
    const session = await getServerSession(authOptions);

    console.log(`Attempting to update spirit with ID: ${id}`);
    
    if (!session?.user?.email) {
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
            email: session.user.email
          }
        },
        include: {
          owner: true
        }
      });

      if (!existingSpirit) {
        console.log(`Spirit not found or does not belong to user: ${session.user.email}`);
        
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

      // Update the spirit but make sure to retain the original owner
      const spirit = await prisma.spirit.update({
        where: { id },
        data: {
          ...validatedData,
          // Ensure ownerId remains unchanged
          ownerId: existingSpirit.ownerId
        },
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
    
    // Get user session
    const session = await getServerSession(authOptions);
    
    console.log(`Received DELETE request for spirit ID: ${id}`);
    console.log('Session user:', session?.user);

    if (!session?.user?.email) {
      console.log('Unauthorized: No user in session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if spirit exists and belongs to user
    console.log(`Looking for spirit with ID: ${id} owned by: ${session.user.email}`);
    const existingSpirit = await prisma.spirit.findFirst({
      where: {
        id,
        owner: {
          email: session.user.email
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
    
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
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
          email: session.user.email
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