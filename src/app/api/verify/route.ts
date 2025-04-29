import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { createServerSupabaseClient, supabase, safeSupabaseQuery } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    // Check if we have a session
    const sessionInfo = user ? {
      hasSession: true,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      id: user.id,
    } : {
      hasSession: false
    };
    
    // Check database connection by trying to count users
    let dbStatus = 'unknown';
    let userCount = 0;
    let firstUser = null;
    
    try {
      // Use Supabase query instead of Prisma
      const { data, count, error } = await supabase
        .from('User')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      
      userCount = count || 0;
      dbStatus = 'connected';
      
      if (userCount > 0) {
        // Get first user with Supabase
        const { data: firstUserData, error: firstUserError } = await supabase
          .from('User')
          .select('id, email, name')
          .limit(1)
          .single();
        
        if (firstUserError) throw firstUserError;
        firstUser = firstUserData;
      }
    } catch (dbError) {
      dbStatus = 'error';
      console.error('Database error:', dbError);
    }
    
    // Check if the session user exists in the database
    let sessionUserFound = false;
    if (user?.email) {
      try {
        // Use Supabase to find the user by email
        const { data: dbUser, error } = await supabase
          .from('User')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
        
        if (error) throw error;
        sessionUserFound = !!dbUser;
      } catch (userError) {
        console.error('Error finding session user:', userError);
      }
    }
    
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      session: sessionInfo,
      database: {
        status: dbStatus,
        userCount,
        firstUser,
        sessionUserFound
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 