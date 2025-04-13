import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// GET /api/auth/check-status - Check if the user is already registered without performing a full sync
export async function GET() {
  try {
    // Since Next.js 15, cookies() is an async function
    const cookieStore = await cookies();
    
    // Create the Supabase client with SSR
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (err) {
              console.error('Error setting cookies in check-status route:', err);
              // Continue anyway as this might be called from a Server Component
              // where cookie setting isn't supported
            }
          }
        }
      }
    );
    
    // Get the authenticated user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No authenticated user found' },
        { status: 401 }
      );
    }
    
    // Use the authenticated user data
    const supabaseUser = userData.user;
    
    // Check if the user has the is_registered flag in either metadata location
    const isRegisteredInAuth = supabaseUser.app_metadata?.is_registered === true ||
                             supabaseUser.user_metadata?.is_registered === true;
                             
    // If the user has a last_synced_at timestamp in the past 24 hours, consider them registered
    let lastSynced = supabaseUser.app_metadata?.last_synced_at || supabaseUser.user_metadata?.last_synced_at;
    let hasRecentSync = false;
    
    if (lastSynced) {
      const syncTime = new Date(lastSynced);
      const timeSinceSync = Date.now() - syncTime.getTime();
      hasRecentSync = timeSinceSync < 24 * 60 * 60 * 1000; // 24 hours
    }
    
    // If already registered according to auth metadata, return quickly
    if (isRegisteredInAuth || hasRecentSync) {
      return NextResponse.json({
        isRegistered: true,
        lastSynced,
        source: 'auth_metadata',
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email,
        }
      });
    }
    
    // If not registered according to metadata, check database
    try {
      // Check if the user exists in the database
      const dbUser = await prisma.user.findUnique({
        where: { id: supabaseUser.id },
        select: { id: true, email: true, lastSyncedAt: true }
      });
      
      // If the user exists in the database, update their auth metadata
      if (dbUser) {
        // Format timestamp for metadata
        const lastSyncedStr = dbUser.lastSyncedAt?.toISOString() || new Date().toISOString();
        
        // Update the user metadata to reflect their registration status
        await supabase.auth.updateUser({
          data: {
            is_registered: true,
            last_synced_at: lastSyncedStr
          }
        });
        
        return NextResponse.json({
          isRegistered: true,
          lastSynced: lastSyncedStr,
          source: 'database',
          user: {
            id: supabaseUser.id,
            email: supabaseUser.email,
          }
        });
      }
    } catch (dbError) {
      console.error('Error checking database for user:', dbError);
      // Continue to return not registered
    }
    
    // Not registered in either auth metadata or database
    return NextResponse.json({
      isRegistered: false,
      lastSynced: null,
      user: {
        id: supabaseUser.id,
        email: supabaseUser.email,
      }
    });
  } catch (error) {
    console.error('Error checking user status:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 