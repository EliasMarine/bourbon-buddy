import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { supabase, safeSupabaseQuery } from '@/lib/supabase';
import { z } from 'zod';

const CreateStreamSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(5000).optional().nullable(),
  spiritId: z.string().optional().nullable(),
  privacy: z.enum(['public', 'private']).default('public'),
  invitedEmails: z.array(z.string().email()).optional(),
});

// GET /api/streams - Get all active streams
export async function GET() {
  try {
    // Calculate the stale threshold (1 hour ago)
    const staleThreshold = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago

    // Use Supabase for the database call
    const { data: streams, error } = await supabase
      .from('Stream')
      .select(`
        *,
        host:User!Stream_hostId_fkey (
          name, 
          image
        ),
        spirit:Spirit (
          name, 
          type, 
          brand
        )
      `)
      .eq('isLive', true)
      .gte('startedAt', staleThreshold)
      .order('startedAt', { ascending: false });

    if (error) throw error;

    // Create response with cache headers
    const response = NextResponse.json({ streams });
    
    // Add caching headers to prevent frequent re-fetching
    // Cache for 30 seconds - a bit less than videos since streams may change more often
    response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    response.headers.set('CDN-Cache-Control', 'public, max-age=30');
    response.headers.set('Vercel-CDN-Cache-Control', 'public, max-age=30');
    
    return response;
  } catch (error) {
    console.error('Streams GET error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      // Supabase error fields
      if ('code' in error) console.error('Supabase error code:', (error as any).code);
      if ('details' in error) console.error('Supabase error details:', (error as any).details);
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/streams - Create a new stream
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    try {
      const validatedData = CreateStreamSchema.parse(body);
      
      // Find user by email
      const { data: dbUser, error: userError } = await supabase
        .from('User')
        .select('id, name, email, image')
        .eq('email', user.email)
        .single();

      if (userError || !dbUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Prepare data for database - handle nulls and undefined properly
      const cleanData = {
        title: validatedData.title,
        description: validatedData.description || null, // Convert undefined to null
        privacy: validatedData.privacy,
        hostId: dbUser.id,
        isLive: false, // Start as not live until the host starts streaming
        startedAt: new Date().toISOString(),
        spiritId: (validatedData.spiritId && validatedData.spiritId.trim() !== '') ? validatedData.spiritId : null
      };

      // Create the stream
      const { data: stream, error: streamError } = await supabase
        .from('Stream')
        .insert(cleanData)
        .select(`
          *,
          host:User!Stream_hostId_fkey (
            id, 
            name, 
            email, 
            image
          ),
          spirit:Spirit (
            name, 
            type, 
            brand
          )
        `)
        .single();

      if (streamError) throw streamError;

      // If the stream is private, handle invited emails here
      if (validatedData.privacy === 'private' && validatedData.invitedEmails?.length) {
        // Here you would handle sending invitations to the provided emails
        console.log('Inviting users to private stream:', validatedData.invitedEmails);
      }

      // Return the full stream object with explicit ID field
      return NextResponse.json(stream);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Validation error:', validationError.errors);
        return NextResponse.json(
          { 
            error: 'Validation error',
            details: validationError.errors 
          },
          { status: 400 }
        );
      }
      throw validationError; // Re-throw if it's not a validation error
    }
  } catch (error) {
    console.error('Stream POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Constants for stream cleanup
const CLEANUP_PERIODS = {
  STALE_LIVE: 1 * 60 * 60 * 1000,     // 1 hour for live streams that weren't properly ended
  INACTIVE: 1 * 60 * 60 * 1000,       // 1 hour for inactive streams
  COMPLETED: 1 * 60 * 60 * 1000       // 1 hour for completed streams
};

// PATCH /api/streams - Clean up old streams
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = Date.now();
    const threshold = new Date(now - CLEANUP_PERIODS.INACTIVE).toISOString();

    // Delete all streams (live or not) that are older than 1 hour
    const { data, error, count } = await supabase
      .from('Stream')
      .delete()
      .lt('startedAt', threshold)
      .select('id');

    if (error) throw error;

    return NextResponse.json({ 
      success: true,
      message: `Cleaned up ${data?.length || 0} old streams`,
      deletedCount: data?.length || 0
    });
  } catch (error) {
    console.error('Streams PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 