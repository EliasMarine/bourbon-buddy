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
          image: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          coverPhoto: user.user_metadata?.coverPhoto
        }
      });
    }

    // Return the full user profile
    return NextResponse.json({
      user: userData
    });
  } catch (error) {
    console.error('Error in GET /api/user/profile:', error);
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

    // Get the request data
    const requestData = await request.json();
    
    // Get the fields to update
    const { image, coverPhoto, name, username } = requestData;
    
    // Build update object with only the provided fields
    const updateData: Record<string, any> = {};
    if (image !== undefined) updateData.image = image;
    if (coverPhoto !== undefined) updateData.coverPhoto = coverPhoto;
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    
    // Add timestamp
    updateData.updatedAt = new Date().toISOString();
    
    // Update the user in the database
    const { data: updatedUser, error: updateError } = await supabase
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

    // Also update user metadata in auth to keep it in sync
    try {
      // Only update certain fields in metadata to avoid overwriting other metadata
      const metadataUpdate: Record<string, any> = {};
      if (image !== undefined) metadataUpdate.avatar_url = image;
      if (name !== undefined) metadataUpdate.name = name;
      if (username !== undefined) metadataUpdate.username = username;
      if (coverPhoto !== undefined) metadataUpdate.coverPhoto = coverPhoto;
      
      // Update metadata only if we have fields to update
      if (Object.keys(metadataUpdate).length > 0) {
        await supabase.auth.updateUser({
          data: metadataUpdate
        });
      }
    } catch (metadataError) {
      console.error('Failed to update user metadata:', metadataError);
      // Continue without failing the request
    }

    // Return the updated user
    return NextResponse.json({
      user: updatedUser
    });
  } catch (error) {
    console.error('Error in POST /api/user/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
