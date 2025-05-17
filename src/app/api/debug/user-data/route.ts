import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';

export async function GET(request: Request) {
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
    
    // Get user data from database
    const { data: userData, error: userDataError } = await supabase
      .from('User')
      .select('id, name, email, username, image, coverPhoto, createdAt, updatedAt')
      .eq('id', user.id)
      .single();
      
    if (userDataError) {
      console.error('Error fetching user data:', userDataError);
      return NextResponse.json(
        { error: 'Failed to fetch user data', details: userDataError.message },
        { status: 500 }
      );
    }
    
    if (!userData) {
      console.error('No user data found');
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }
    
    // Sanitize and return the data
    return NextResponse.json({
      authUser: {
        id: user.id,
        email: user.email,
        metadata: {
          ...user.user_metadata,
          // Truncate any long URLs for readability
          avatar_url: user.user_metadata?.avatar_url ? 
            (user.user_metadata.avatar_url.length > 100 ? 
              user.user_metadata.avatar_url.substring(0, 50) + '...' + 
              user.user_metadata.avatar_url.substring(user.user_metadata.avatar_url.length - 50) : 
              user.user_metadata.avatar_url) : null,
          coverPhoto: user.user_metadata?.coverPhoto ? 
            (user.user_metadata.coverPhoto.length > 100 ? 
              user.user_metadata.coverPhoto.substring(0, 50) + '...' + 
              user.user_metadata.coverPhoto.substring(user.user_metadata.coverPhoto.length - 50) : 
              user.user_metadata.coverPhoto) : null
        },
        hasCoverPhoto: !!user.user_metadata?.coverPhoto,
        hasAvatar: !!user.user_metadata?.avatar_url
      },
      dbUser: {
        ...userData,
        // Truncate any long URLs for readability
        image: userData.image ? 
          (userData.image.length > 100 ? 
            userData.image.substring(0, 50) + '...' + 
            userData.image.substring(userData.image.length - 50) : 
            userData.image) : null,
        coverPhoto: userData.coverPhoto ? 
          (userData.coverPhoto.length > 100 ? 
            userData.coverPhoto.substring(0, 50) + '...' + 
            userData.coverPhoto.substring(userData.coverPhoto.length - 50) : 
            userData.coverPhoto) : null,
        hasCoverPhoto: !!userData.coverPhoto,
        hasImage: !!userData.image
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 