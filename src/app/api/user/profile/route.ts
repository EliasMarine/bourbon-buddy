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
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user data from the User table
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('id, name, email, username, image, coverPhoto')
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

    return NextResponse.json({
      user: userData
    });
  } catch (err) {
    console.error('Error in profile endpoint:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerComponentClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body for profile updates
    const body = await request.json();
    const { name, username, image, coverPhoto } = body;

    // Prepare update data with only the fields that are provided
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    if (image !== undefined) updateData.image = image;
    if (coverPhoto !== undefined) updateData.coverPhoto = coverPhoto;
    
    // Add timestamp
    updateData.updatedAt = new Date().toISOString();

    // Check if there's anything to update
    if (Object.keys(updateData).length === 1 && updateData.updatedAt) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update the user profile in the database
    const { data, error: updateError } = await supabase
      .from('User')
      .update(updateData)
      .eq('id', user.id)
      .select('id, name, email, username, image, coverPhoto')
      .single();

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: data,
      message: 'Profile updated successfully'
    });
  } catch (err) {
    console.error('Error in profile update endpoint:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
