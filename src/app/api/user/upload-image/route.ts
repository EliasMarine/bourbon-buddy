import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Initialize admin client with full privileges
const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get user from Supabase Auth
    const supabase = await createServerComponentClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error in upload-image API:', userError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the multipart request body
    const formData = await request.formData();
    
    // Get the file and type from the form data
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'profile';
    
    // Validate request
    if (!file) {
      console.error('No file provided in upload-image API');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (type !== 'profile' && type !== 'cover') {
      console.error(`Invalid type provided in upload-image API: ${type}`);
      return NextResponse.json(
        { error: 'Invalid type. Must be "profile" or "cover"' },
        { status: 400 }
      );
    }

    console.log('Processing image upload:', {
      userId: user.id,
      type,
      fileSize: file.size,
      fileName: file.name,
      fileType: file.type
    });

    // Generate a unique path
    const timestamp = Date.now();
    const uniqueId = uuidv4().replace(/-/g, '');
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Create a path based on the type and user ID
    const filePath = `users/${user.id}/${type}/${timestamp}-${uniqueId}.${fileExtension}`;
    
    // Upload the file
    const { data, error: uploadError } = await supabase.storage
      .from('bourbon-buddy-prod')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      });
      
    if (uploadError) {
      console.error('Upload error in upload-image API:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload image: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('bourbon-buddy-prod')
      .getPublicUrl(filePath);
      
    if (!urlData?.publicUrl) {
      console.error('Failed to get public URL in upload-image API');
      return NextResponse.json(
        { error: 'Failed to get public URL for uploaded image' },
        { status: 500 }
      );
    }
    
    const imageUrl = urlData.publicUrl;
    console.log('Image uploaded successfully:', imageUrl);

    // Update the user profile
    let updateResult;
    if (type === 'profile') {
      updateResult = await supabase
        .from('User')
        .update({ image: imageUrl })
        .eq('id', user.id);
    } else { // cover
      updateResult = await supabase
        .from('User')
        .update({ coverPhoto: imageUrl })
        .eq('id', user.id);
    }
    
    if (updateResult.error) {
      console.error('Error updating user profile:', updateResult.error);
      return NextResponse.json(
        { error: `Failed to update user profile: ${updateResult.error.message}` },
        { status: 500 }
      );
    }
    
    // Fetch the updated user record
    const { data: updatedUser, error: fetchError } = await supabase
      .from('User')
      .select('id, name, username, email, image, coverPhoto')
      .eq('id', user.id)
      .single();
      
    if (fetchError) {
      console.error('Error fetching updated user data:', fetchError);
      // Continue without failing the request
    }

    // Also update user metadata to keep auth in sync
    try {
      const metadataUpdate = type === 'profile'
        ? { avatar_url: imageUrl, name: updatedUser?.name || user.user_metadata?.name }
        : { coverPhoto: imageUrl };
        
      // Use admin client to ensure the update succeeds
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          ...metadataUpdate,
          last_synced_at: new Date().toISOString()
        }
      });
      
      if (authUpdateError) {
        console.error('Error updating user auth metadata:', authUpdateError);
        // Continue without failing the request
      }
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