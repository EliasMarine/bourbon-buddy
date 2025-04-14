import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, reconnectPrisma } from '@/lib/prisma';
import { createServerClient } from '@supabase/ssr';
import { SpiritSchema } from '@/lib/validations/spirit';
import spiritCategories from '@/lib/spiritCategories';
import { ZodError } from 'zod';
import { collectionGetLimiter, collectionPostLimiter } from '@/lib/rate-limiters';
import { validateCsrfToken } from '@/lib/csrf';

export const dynamic = 'force-dynamic';

// GET /api/collection - Get user's collection
export async function GET(request: NextRequest) {
  try {
    console.log('Collection GET route started');
    const cookieStore = await cookies();
    console.log('Cookie store initialized');
    
    // Use createServerClient with cookies to ensure proper auth
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (err) {
              console.error('Error setting cookies in collection route:', err);
              // Continue anyway as this might be called from a route handler
              // where cookie setting isn't supported
            }
          }
        }
      }
    );
    console.log('Supabase client created');
    
    try {
      // Get user directly to avoid session validation issues
      console.log('Attempting to get user from auth');
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error in collection API:', userError);
        return NextResponse.json({ 
          error: 'Unauthorized', 
          message: 'Authentication error: ' + userError.message
        }, { status: 401 });
      }
      
      if (!userData?.user) {
        console.error('No user found in auth response');
        return NextResponse.json({ 
          error: 'Unauthorized', 
          message: 'No authenticated user found'
        }, { status: 401 });
      }
      
      console.log('User authenticated successfully:', userData.user.id);
      const userId = userData.user.id;
      
      // Get user's spirits from database
      try {
        console.log('Attempting to fetch spirits for user:', userId);
        
        // Use standard query now that the webImageUrl column issue is fixed
        const spirits = await prisma.spirit.findMany({
          where: {
            ownerId: userId,
            deletedAt: null // Only include non-deleted spirits
          }
        });
        
        console.log('Successfully fetched spirits, count:', spirits.length);
        return NextResponse.json({ spirits });
      } catch (dbError: any) {
        console.error('Database error details:', {
          message: dbError.message,
          code: dbError.code,
          meta: dbError.meta,
          stack: dbError.stack
        });
        
        return NextResponse.json(
          { error: 'Failed to fetch collection', details: dbError.message, code: dbError.code },
          { status: 500 }
        );
      }
    } catch (authError: any) {
      console.error('Auth processing error:', authError);
      return NextResponse.json(
        { error: 'Authentication error', message: authError.message },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Top-level error in collection route:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch collection', 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/collection - Add new spirit to collection
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  
  // Use createServerClient with cookies to ensure proper auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (err) {
            console.error('Error setting cookies in collection route:', err);
            // Continue anyway as this might be called from a route handler
            // where cookie setting isn't supported
          }
        }
      }
    }
  );
  
  try {
    // Get user directly to avoid session validation issues
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error('Auth error in collection API:', userError || 'No user found');
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'You must be signed in to add to your collection.'
      }, { status: 401 });
    }
    
    const userId = userData.user.id;
    
    // Parse the request body
    const body = await request.json().catch(err => {
      console.error('Error parsing request body:', err);
      return null;
    });
    
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { name, brand, type, description } = body;
    
    // Validate input
    if (!name) {
      return NextResponse.json(
        { error: 'Spirit name is required' },
        { status: 400 }
      );
    }
    
    // Create the spirit
    try {
      const spirit = await prisma.spirit.create({
        data: {
          name,
          brand: brand || '',
          type: type || 'whiskey',
          description: description || '',
          ownerId: userId,
          category: 'whiskey',
        },
      });
      
      return NextResponse.json({ spirit }, { status: 201 });
    } catch (dbError: any) {
      console.error('Database error creating spirit:', dbError);
      
      // Handle specific database errors
      if (dbError.code === 'P2023' || dbError.message?.includes('prepared statement')) {
        return NextResponse.json(
          { error: 'Database connection error. Please try again.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create spirit', details: dbError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating spirit:', error);
    
    return NextResponse.json(
      { error: 'Failed to create spirit', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 