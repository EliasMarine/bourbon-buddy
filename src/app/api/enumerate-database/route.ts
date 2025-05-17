import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Create a Supabase client
    const supabase = await createServerComponentClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch the user record from the database
    const { data: userData, error: userDataError } = await supabase
      .from('User')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      console.error('Error fetching user data:', userDataError);
      return NextResponse.json(
        { error: 'Failed to fetch user data', details: userDataError.message },
        { status: 500 }
      );
    }

    // Get auth metadata
    const { data: authData } = await supabase.auth.getUser();
    
    // Sanitize data for output
    const sanitizedUserData = {
      ...userData,
      // Add any fields that need to be sanitized
    };

    const sanitizedAuthData = {
      id: authData.user?.id,
      email: authData.user?.email,
      metadata: authData.user?.user_metadata
    };

    return NextResponse.json({
      userRecord: sanitizedUserData,
      authData: sanitizedAuthData
    });
  } catch (error) {
    console.error('Error in database enumeration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 