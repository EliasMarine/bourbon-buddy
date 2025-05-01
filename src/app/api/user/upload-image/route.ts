import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = await createServerComponentClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication required for upload-image API:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get data from request
    const data = await request.json();
    const { imageUrl, type } = data;

    // Validate parameters
    if (!imageUrl) {
      console.error('No image URL provided to upload-image API');
      return NextResponse.json(
        { error: 'No image URL provided' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'profile' && type !== 'cover')) {
      console.error('Invalid image type provided to upload-image API:', type);
      return NextResponse.json(
        { error: 'Invalid image type. Must be "profile" or "cover"' },
        { status: 400 }
      );
    }

    // Update user in database based on type
    const updateData: Record<string, any> = type === 'profile' 
      ? { image: imageUrl } 
      : { coverPhoto: imageUrl };
    
    // Add timestamp
    updateData.updatedAt = new Date().toISOString();

    // Update in database
    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update(updateData)
      .eq('id', user.id)
      .select('id, name, email, username, image, coverPhoto')
      .single();

    if (updateError) {
      console.error('Error updating user with new image:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    // Also update user metadata to keep auth in sync
    try {
      const metadataUpdate = type === 'profile'
        ? { avatar_url: imageUrl }
        : { coverPhoto: imageUrl };
        
      await supabase.auth.updateUser({
        data: metadataUpdate
      });
    } catch (metadataError) {
      console.error('Error updating user metadata:', metadataError);
      // Continue without failing the request
    }

    // Sync metadata
    try {
      // No need to wait for this
      fetch('/api/auth/sync-metadata', { 
        method: 'GET',
        cache: 'no-store'
      }).catch(e => console.error('Background metadata sync failed:', e));
    } catch (syncError) {
      console.error('Error triggering metadata sync:', syncError);
      // Continue without failing
    }

    return NextResponse.json({
      success: true,
      message: `${type === 'profile' ? 'Profile' : 'Cover'} image updated successfully`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Unhandled error in upload-image API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 