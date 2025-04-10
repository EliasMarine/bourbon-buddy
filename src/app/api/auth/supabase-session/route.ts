import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
// Removed authOptions import - not needed with Supabase Auth;
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Maximum age for the JWT token (in seconds)
const MAX_AGE = 60 * 60 * 24 * 7; // 1 week

// Helper to generate debug ID for logs
const generateDebugId = () => Math.random().toString(36).substring(2, 8);

interface SupabaseUser {
  id: string;
  email?: string;
  [key: string]: any;
}

export async function POST() {
  const debugId = generateDebugId();
  console.log(`[${debugId}] 🔄 Supabase session sync requested`);
  
  try {
    // Get the current NextAuth session
    const user = await getCurrentUser();
    
    // Log session details (with some redaction for privacy)
    console.log(`[${debugId}] 📊 NextAuth session:`, {
      hasSession: !!session,
      hasUser: !!user,
      hasEmail: !!user?.email,
      email: user?.email ? `${session.user.email.substring(0, 3)}...` : null,
      hasName: !!user?.name,
      hasImage: !!user?.image,
      hasAccessToken: !!session?.accessToken,
    });
    
    // If no session, return unauthorized
    if (!user?.email) {
      console.log(`[${debugId}] ❌ No valid NextAuth session found`);
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
    
    console.log(`[${debugId}] 🔍 Looking up Supabase user for email: ${session.user.email.substring(0, 3)}...`);
    
    // First, look up the user by email using listUsers and filtering
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error(`[${debugId}] ❌ Error looking up Supabase users:`, listError);
      return NextResponse.json(
        { error: 'Database Error', message: 'Failed to find user' },
        { status: 500 }
      );
    }
    
    console.log(`[${debugId}] ✅ Found ${usersData.users.length} Supabase users`);
    
    // Find the user with matching email - use type assertion to handle typing issue
    const existingUser = (usersData.users as SupabaseUser[]).find(
      user => user.email?.toLowerCase() === session.user.email?.toLowerCase()
    );
    
    if (!existingUser) {
      console.log(`[${debugId}] 🆕 No Supabase user found, creating a new one`);
      
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
        console.error(`[${debugId}] ❌ Error creating Supabase user:`, createError);
        return NextResponse.json(
          { error: 'User Creation Failed', message: 'Failed to create Supabase user' },
          { status: 500 }
        );
      }
      
      console.log(`[${debugId}] ✅ Created new Supabase user with ID: ${newUser.user.id.substring(0, 8)}...`);
      userId = newUser.user.id;
    } else {
      console.log(`[${debugId}] ✅ Found existing Supabase user with ID: ${existingUser.id.substring(0, 8)}...`);
      userId = existingUser.id;
      
      // Update user metadata if needed to keep it in sync
      if (session.user.name || session.user.image) {
        console.log(`[${debugId}] 🔄 Updating Supabase user metadata`);
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            full_name: session.user.name || existingUser.user_metadata?.full_name || session.user.email,
            avatar_url: session.user.image || existingUser.user_metadata?.avatar_url,
            source: 'nextauth_sync_updated'
          }
        });
      }
    }
    
    // Generate a JWT token using the JWT_SECRET
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
    
    if (!supabaseJwtSecret) {
      console.error(`[${debugId}] ❌ Missing SUPABASE_JWT_SECRET environment variable`);
      return NextResponse.json(
        { error: 'Configuration Error', message: 'Server is not properly configured' },
        { status: 500 }
      );
    }
    
    // Current timestamp in seconds
    const now = Math.floor(Date.now() / 1000);
    const expires = now + MAX_AGE;
    
    // Create payload for the JWT with all required fields
    const payload = {
      aud: 'authenticated',
      exp: expires,
      sub: userId,
      email: session.user.email,
      iat: now,
      jti: crypto.randomUUID(),
      app_metadata: {
        provider: 'nextauth'
      },
      user_metadata: {
        full_name: session.user.name || session.user.email,
        avatar_url: session.user.image || undefined,
      },
      role: 'authenticated'
    };
    
    console.log(`[${debugId}] 🔑 Generating JWT token with expiry: ${new Date(expires * 1000).toISOString()}`);
    
    // Sign the JWT with the HS256 algorithm explicitly
    const access_token = jwt.sign(payload, supabaseJwtSecret, { algorithm: 'HS256' });
    
    // Generate a refresh token - using UUID for better security
    const refresh_token = crypto.randomUUID();
    
    console.log(`[${debugId}] ✅ Successfully created Supabase JWT, token length: ${access_token.length}`);
    
    // Return tokens for the client
    return NextResponse.json({
      success: true,
      properties: {
        access_token,
        refresh_token,
        expires_in: MAX_AGE,
        expires_at: expires
      }
    });
  } catch (error) {
    console.error(`[${debugId || 'unknown'}] ❌ Unexpected error in supabase-session API:`, error);
    return NextResponse.json(
      { error: 'Server Error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 