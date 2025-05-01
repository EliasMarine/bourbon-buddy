import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';

export async function GET(request: Request) {
  const supabase = await createServerComponentClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Fetch the user data from the User table
  const { data: userData, error: userError } = await supabase
    .from('User')
    .select('id, name, email, username, image')
    .eq('id', user.id)
    .single();

  if (userError) {
    console.error('Error fetching user profile:', userError);
    
    // Fall back to auth data if database query fails
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
        username: user.user_metadata?.username || user.user_metadata?.preferred_username || user.email?.split('@')[0],
        image: user.user_metadata?.avatar_url || user.user_metadata?.picture
      }
    });
  }

  // Return the user data from the database
  return NextResponse.json({
    user: userData
  });
} 