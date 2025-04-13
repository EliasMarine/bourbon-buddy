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
        message: 'You must be signed in to access your collection.'
      }, { status: 401 });
    }
    
    const userId = userData.user.id;
    
    // Get user's spirits from database
    try {
      const spirits = await prisma.spirit.findMany({
        where: {
          ownerId: userId,
        },
      });
      
      return NextResponse.json({ spirits });
    } catch (dbError: any) {
      console.error('Database error fetching collection:', dbError);
      
      // Check for specific database errors and provide more detailed handling
      const isPrismaConnectionError = 
        dbError.message?.includes('prepared statement') ||
        dbError.code === '26000' || 
        dbError.code === 'P2023' ||
        dbError.message?.includes('connection');
        
      if (isPrismaConnectionError) {
        // Use the dedicated reconnection utility
        console.log('Attempting to recover database connection...');
        const reconnected = await reconnectPrisma();
        
        if (reconnected) {
          // Try the query again with the fresh connection
          try {
            console.log('Retrying query with fresh connection...');
            const spirits = await prisma.spirit.findMany({
              where: {
                ownerId: userId,
              },
            });
            
            console.log('Retry successful!');
            return NextResponse.json({ spirits });
          } catch (retryError) {
            console.error('Retry failed after reconnection:', retryError);
          }
        }
        
        // If reconnection or retry failed, send error response
        return NextResponse.json(
          { 
            error: 'Database connection issue', 
            message: 'The server is experiencing temporary database connection issues. Please try again in a moment.',
            retryable: true 
          },
          { 
            status: 503,
            headers: {
              'Retry-After': '5', // Suggest client retry after 5 seconds
              'Cache-Control': 'no-store, no-cache'
            }
          }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch collection', details: dbError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching collection:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch collection', message: error instanceof Error ? error.message : 'Unknown error' },
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