import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Maximum age for the JWT token (in seconds)
const MAX_AGE = 60 * 60 * 24 * 7; // 1 week

interface SupabaseUser {
  id: string;
  email?: string;
  [key: string]: any;
}

export async function POST() {
  try {
    // Get the current NextAuth session
    const session = await getServerSession(authOptions);
    
    // If no session, return unauthorized
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Create an admin Supabase client to create a session
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get or create the Supabase user
    let userId: string;
    
    // First, look up the user by email using listUsers and filtering
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error looking up Supabase users:', listError);
      return NextResponse.json(
        { error: 'Database Error', message: 'Failed to find user' },
        { status: 500 }
      );
    }
    
    // Find the user with matching email - use type assertion to handle typing issue
    const existingUser = (usersData.users as SupabaseUser[]).find(
      user => user.email?.toLowerCase() === session.user.email?.toLowerCase()
    );
    
    if (!existingUser) {
      // Create user in Supabase using admin client
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: session.user.email,
        email_confirm: true,
        user_metadata: {
          full_name: session.user.name || session.user.email,
          avatar_url: session.user.image || undefined,
          source: 'nextauth_sync'
        }
      });
      
      if (createError) {
        console.error('Error creating Supabase user:', createError);
        return NextResponse.json(
          { error: 'User Creation Failed', message: 'Failed to create Supabase user' },
          { status: 500 }
        );
      }
      
      userId = newUser.user.id;
    } else {
      userId = existingUser.id;
    }
    
    // Generate a JWT token using the JWT_SECRET
    // This is the proper way to create a custom token for Supabase
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
    
    if (!supabaseJwtSecret) {
      console.error('Missing SUPABASE_JWT_SECRET environment variable');
      return NextResponse.json(
        { error: 'Configuration Error', message: 'Server is not properly configured' },
        { status: 500 }
      );
    }
    
    // Current timestamp in seconds
    const now = Math.floor(Date.now() / 1000);
    
    // Create payload for the JWT
    const payload = {
      aud: 'authenticated',
      exp: now + MAX_AGE,
      sub: userId,
      email: session.user.email,
      app_metadata: {
        provider: 'nextauth'
      },
      user_metadata: {
        full_name: session.user.name || session.user.email,
        avatar_url: session.user.image || undefined,
      },
      role: 'authenticated'
    };
    
    // Sign the JWT
    const access_token = jwt.sign(payload, supabaseJwtSecret);
    
    // Generate a refresh token (this is a simple implementation, would be better with proper crypto)
    const refresh_token = Buffer.from(crypto.randomUUID()).toString('base64');
    
    // Return tokens for the client
    return NextResponse.json({
      success: true,
      properties: {
        access_token,
        refresh_token,
        expires_in: MAX_AGE
      }
    });
  } catch (error) {
    console.error('Unexpected error in supabase-session API:', error);
    return NextResponse.json(
      { error: 'Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 