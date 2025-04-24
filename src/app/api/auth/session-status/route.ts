import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
// Removed authOptions import - not needed with Supabase Auth;
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    // Get Supabase session
    const supabase = createServerClient();
    const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting Supabase session:', error);
    }
    
    // Get Supabase user if session exists
    let supabaseUser = null;
    if (supabaseSession) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting Supabase user:', userError);
      } else {
        supabaseUser = {
          id: user?.id,
          email: user?.email,
          createdAt: user?.created_at,
        };
      }
    }
    
    // Return both session statuses for debugging
    return NextResponse.json({
      supabase: {
        authenticated: !!supabaseSession,
        session: supabaseSession ? {
          expires_at: supabaseSession.expires_at,
          user_id: supabaseSession.user.id,
        } : null,
        user: supabaseUser,
      },
      status: {
        synced: !!supabaseSession && !!supabaseUser && 
               supabaseSession.user?.email === supabaseUser?.email,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error in session-status API:', error);
    return NextResponse.json(
      { error: 'Server Error', message: 'Failed to check session status' },
      { status: 500 }
    );
  }
} 