import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Create Supabase client
    const supabase = await createServerComponentClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Starting metadata refresh for user:', user.id);
    
    // Get user data from database
    const { data: userData, error: userDataError } = await supabase
      .from('User')
      .select('id, name, email, username, image, coverPhoto')
      .eq('id', user.id)
      .single();
      
    if (userDataError) {
      console.error('Error fetching user data for metadata refresh:', userDataError);
      return NextResponse.json(
        { error: 'Failed to fetch user data', details: userDataError.message },
        { status: 500 }
      );
    }
    
    if (!userData) {
      console.error('No user data found for metadata refresh');
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }
    
    // Update auth metadata with values from the database
    console.log('Updating auth metadata with database values', {
      hasImage: !!userData.image,
      hasCoverPhoto: !!userData.coverPhoto,
      coverPhotoLength: userData.coverPhoto?.length || 0
    });
    
    const metadataUpdate: Record<string, any> = {};
    
    // Only update fields that exist in the database
    if (userData.image) metadataUpdate.avatar_url = userData.image;
    if (userData.name) metadataUpdate.name = userData.name;
    if (userData.username) metadataUpdate.username = userData.username;
    if (userData.coverPhoto) metadataUpdate.coverPhoto = userData.coverPhoto;
    
    // Update auth user
    if (Object.keys(metadataUpdate).length > 0) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: metadataUpdate
      });
      
      if (updateError) {
        console.error('Failed to update auth metadata:', updateError);
        return NextResponse.json(
          { error: 'Failed to update auth metadata', details: updateError.message },
          { status: 500 }
        );
      }
      
      console.log('Auth metadata updated successfully');
    } else {
      console.log('No metadata fields to update');
    }
    
    // Get the updated user data
    const { data: updatedAuthData } = await supabase.auth.getUser();
    
    return NextResponse.json({
      success: true,
      message: 'Metadata refresh completed',
      user: {
        id: user.id,
        email: user.email,
        dbData: {
          hasCoverPhoto: !!userData.coverPhoto,
          coverPhotoUrl: userData.coverPhoto || null
        },
        authData: {
          hasCoverPhoto: !!updatedAuthData.user?.user_metadata?.coverPhoto,
          coverPhotoUrl: updatedAuthData.user?.user_metadata?.coverPhoto || null
        }
      }
    });
  } catch (error) {
    console.error('Error in metadata refresh:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 