import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';

// This is a stub route file created for development builds
// The original file has been temporarily backed up

export async function GET(request: Request) {
  try {
    const supabase = await createServerComponentClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { isRegistered: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user exists in the database
    const { data, error: checkError } = await supabase
      .from('User')
      .select('id, name, username, email, image')
      .eq('id', user.id)
      .single();

    // PGRST116 means "no rows returned" which is expected when the user doesn't exist
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user status:', checkError);
      return NextResponse.json(
        { isRegistered: false, error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      isRegistered: !!data,
      user: data || null
    });
  } catch (err) {
    console.error('Error in check-status endpoint:', err);
    return NextResponse.json(
      { isRegistered: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return NextResponse.json({
    message: 'Use GET method for checking status'
  });
}
