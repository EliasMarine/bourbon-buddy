import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/auth/sync-user - Sync the authenticated user from Supabase to the database
export async function POST() {
  try {
    // Get the authenticated user from Supabase
    const supabase = createServerComponentClient();
    const { data: { user: supabaseUser }, error: supabaseError } = await supabase.auth.getUser();
    
    if (supabaseError) {
      console.error('Supabase session error:', supabaseError);
      return NextResponse.json(
        { error: 'Authentication error', message: supabaseError.message },
        { status: 401 }
      );
    }
    
    if (!supabaseUser) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No authenticated user found' },
        { status: 401 }
      );
    }
    
    // Check if user exists in the database
    let user = await prisma.user.findUnique({
      where: { email: supabaseUser.email }
    });
    
    // If user doesn't exist, create it
    if (!user) {
      console.log(`Creating new user record for ${supabaseUser.email}`);
      
      // Extract name from user metadata if available
      const metadata = supabaseUser.user_metadata || {};
      const name = metadata.full_name || metadata.name || supabaseUser.email?.split('@')[0];
      
      // Create user in database
      user = await prisma.user.create({
        data: {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          name: name,
          username: metadata.username || `user_${supabaseUser.id.substring(0, 8)}`,
          image: metadata.avatar_url || metadata.picture || null,
        }
      });
      
      console.log(`User created with ID: ${user.id}`);
    } else {
      console.log(`User found with ID: ${user.id}`);
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
      }
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 