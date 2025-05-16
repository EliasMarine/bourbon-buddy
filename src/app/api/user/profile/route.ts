import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';
import { validateCsrfToken } from '@/lib/csrf';
import { SupabaseClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/supabase-js';

// This is a stub route file created for development builds
// The original file has been temporarily backed up

// Simple helper for URL truncation in logs
const truncateUrl = (url: string, maxLength: number = 50) => {
  if (!url || url.length <= maxLength) return url;
  return url.substring(0, maxLength/2) + '...' + url.substring(url.length - maxLength/2);
};

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

// Add this function to handle url truncation and database updates
const updateUserWithLimitedCoverPhotoUrl = async (
  supabase: SupabaseClient, 
  user: User, 
  updateData: Record<string, any>
) => {
  // First, get the maximum length of coverPhoto column from database schema
  // For now, we'll use a reasonably safe maximum length
  const MAX_URL_LENGTH = 1000; // Increased to handle modern URLs which can be quite long
  let finalCoverPhotoUrl = updateData.coverPhoto; // Work with a mutable copy

  // Skip URL processing if the value is null/undefined or not a string
  if (!finalCoverPhotoUrl || typeof finalCoverPhotoUrl !== 'string') {
    console.log('No cover photo URL to process or non-string value');
    return { updatedUser: null, updateError: new Error('Invalid cover photo URL') };
  }

  console.log(`Processing cover photo URL (${finalCoverPhotoUrl.length} chars): ${finalCoverPhotoUrl.substring(0, 50)}...`);
  
  // Check if we need to perform URL truncation
  if (finalCoverPhotoUrl.length > MAX_URL_LENGTH) {
    console.log(`Cover photo URL exceeds ${MAX_URL_LENGTH} chars, truncating...`);
    let successfullyTruncated = false;

    // Determine URL type (absolute vs relative)
    const isAbsoluteUrl = finalCoverPhotoUrl.startsWith('http://') || finalCoverPhotoUrl.startsWith('https://');
    
    if (isAbsoluteUrl) {
      // For absolute URLs, try smart truncation with URL parsing
      try {
        const urlObj = new URL(finalCoverPhotoUrl);
        const pathParts = urlObj.pathname.split('/');
        // Keep the filename and important path segments
        const fileName = pathParts.pop() || '';
        const significantPathStart = pathParts.slice(0, 3).join('/'); 
        
        // Build truncated URL with origin, start of path, and filename
        const truncatedSmartUrl = `${urlObj.origin}${significantPathStart}/.../${fileName}`;
        
        if (truncatedSmartUrl.length <= MAX_URL_LENGTH) {
          finalCoverPhotoUrl = truncatedSmartUrl;
          successfullyTruncated = true;
          console.log(`Smart-truncated absolute URL to: ${finalCoverPhotoUrl.substring(0, 50)}...`);
        } else {
          console.log(`Smart-truncated URL still too long (${truncatedSmartUrl.length}), will fallback`);
        }
      } catch (e) {
        console.error('Error during URL parsing:', e);
        // Continue to basic truncation
      }
    } else {
      // For relative paths, use a simpler approach
      console.log('Processing relative path URL');
      
      // Extract the filename from the path if possible
      const pathParts = finalCoverPhotoUrl.split('/');
      const fileName = pathParts.pop() || '';
      
      // For relative URLs, prefer keeping the filename intact if possible
      if (fileName.length < MAX_URL_LENGTH / 2) {
        const simplifiedPath = `/storage/.../${fileName}`;
        if (simplifiedPath.length <= MAX_URL_LENGTH) {
          finalCoverPhotoUrl = simplifiedPath;
          successfullyTruncated = true;
          console.log(`Simplified relative URL to: ${finalCoverPhotoUrl}`);
        }
      }
    }

    // If no smart truncation worked, fall back to basic substring truncation
    if (!successfullyTruncated) {
      console.log(`Applying basic truncation to URL (length: ${finalCoverPhotoUrl.length})`);
      finalCoverPhotoUrl = finalCoverPhotoUrl.substring(0, MAX_URL_LENGTH - 3) + '...';
      console.log(`Truncated to ${finalCoverPhotoUrl.length} chars`);
    }
  }
  
  // Prepare the final data for Supabase update
  const finalUpdateData = { ...updateData };
  
  // Only override the coverPhoto if we're processing it
  if (updateData.coverPhoto !== undefined) {
    finalUpdateData.coverPhoto = finalCoverPhotoUrl;
  }

  try {
    console.log('Using standard update for user profile...');
    
    // Add updatedAt field
    finalUpdateData.updatedAt = new Date().toISOString();
    
    // We've already verified the user exists with a separate query
    // Now perform a standard update which should respect RLS policies
    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update(finalUpdateData)
      .eq('id', user.id)
      .select('id, name, email, username, image, coverPhoto')
      .single();
    
    if (updateError) {
      console.error('Error in database update:', updateError);
      return { updatedUser: null, updateError };
    }
    
    if (!updatedUser) {
      console.error('No user data returned after update');
      return { 
        updatedUser: null, 
        updateError: {
          message: 'Failed to update user profile', 
          code: '500'
        }
      };
    }
    
    return { updatedUser, updateError: null };
  } catch (error) {
    console.error('Exception during profile update:', error);
    return { 
      updatedUser: null, 
      updateError: error instanceof Error ? 
        { message: error.message, code: '500' } : 
        { message: 'Unknown error', code: '500' } 
    };
  }
};

/**
 * Main POST handler to update user profile
 */
export async function POST(request: Request) {
  try {
    // Validate CSRF token
    const csrfToken = request.headers.get('x-csrf-token');
    
    if (!csrfToken) {
      console.warn('Missing CSRF token in profile update request');
      return NextResponse.json(
        { error: 'Missing CSRF token' },
        { status: 403 }
      );
    }
    
    if (!validateCsrfToken(request, csrfToken)) {
      console.error('Invalid CSRF token for profile update request');
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
    
    // Create Supabase client with proper auth context
    console.log('Creating Supabase client for profile update...');
    const supabase = await createServerComponentClient();
    
    // Get the authenticated user
    console.log('Verifying authenticated user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Failed to get authenticated user:', userError);
      return NextResponse.json(
        { message: 'Unauthorized', details: userError?.message || 'No user found' },
        { status: 401 }
      );
    }

    console.log('Authenticated user found:', { id: user.id, email: user.email });
    
    // Parse request body
    let requestData;
    try {
      requestData = await request.json();
      console.log('Request data received:', { 
        hasImage: !!requestData.image, 
        hasCoverPhoto: !!requestData.coverPhoto,
        hasName: !!requestData.name,
        hasUsername: !!requestData.username,
        coverPhotoLength: requestData.coverPhoto ? requestData.coverPhoto.length : 0
      });
    } catch (e) {
      console.error('Failed to parse request JSON:', e);
      return NextResponse.json(
        { error: 'Invalid request data format', details: e instanceof Error ? e.message : String(e) },
        { status: 400 }
      );
    }
    
    // Extract fields to update
    const { image, coverPhoto, name, username } = requestData;
    
    // Build update object with only the provided fields
    const updateData: Record<string, any> = {};
    if (image !== undefined) updateData.image = image;
    if (coverPhoto !== undefined) updateData.coverPhoto = coverPhoto;
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    
    // Add timestamp
    updateData.updatedAt = new Date().toISOString();
    
    if (Object.keys(updateData).length === 1 && updateData.updatedAt) {
      console.warn('No actual fields to update, only timestamp');
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    // Log what we're going to update
    console.log('Updating user profile with:', { 
      userId: user.id,
      fields: Object.keys(updateData).join(', '),
      coverPhoto: coverPhoto ? truncateUrl(coverPhoto, 50) : null
    });

    // First verify user exists and we can access it (confirms RLS is working)
    console.log('Verifying user record exists...');
    const { data: userCheck, error: getUserError } = await supabase
      .from('User')
      .select('id')
      .eq('id', user.id)
      .single();
      
    if (getUserError) {
      console.error('Error verifying user exists:', getUserError);
      return NextResponse.json(
        { error: 'Failed to verify user exists', details: getUserError.message },
        { status: 500 }
      );
    }
    
    if (!userCheck) {
      console.error('User not found or permission denied');
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }
    
    // Now perform the actual update
    console.log('Performing update with standard POST method...');
    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update(updateData)
      .eq('id', user.id)
      .select('id, name, email, username, image, coverPhoto')
      .single();
    
    if (updateError) {
      console.error('Error updating user profile:', updateError);
      
      return NextResponse.json(
        { 
          error: updateError.message || 'Failed to update profile',
          field: coverPhoto ? 'coverPhoto' : 'profile',
          code: updateError.code
        },
        { status: updateError.code === '42501' ? 403 : 500 }
      );
    }

    if (!updatedUser) {
      console.error('No user data returned after update');
      return NextResponse.json(
        { error: 'Failed to update profile - no user returned' },
        { status: 500 }
      );
    }
    
    console.log('Profile update successful!', {
      userId: updatedUser.id,
      updatedFields: Object.keys(updateData).filter(k => k !== 'updatedAt')
    });
    
    // Also update auth metadata to keep in sync
    try {
      console.log('Updating auth metadata...');
      const metadataUpdate: Record<string, any> = {};
      if (image !== undefined) metadataUpdate.avatar_url = image;
      if (name !== undefined) metadataUpdate.name = name;
      if (username !== undefined) metadataUpdate.username = username;
      if (coverPhoto !== undefined) metadataUpdate.coverPhoto = coverPhoto;
      
      if (Object.keys(metadataUpdate).length > 0) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: metadataUpdate
        });
        
        if (metadataError) {
          console.error('CRITICAL: Failed to update auth metadata:', metadataError);
          // Return an error to the client if metadata update fails
          return NextResponse.json(
            { error: 'Failed to update profile metadata', details: metadataError.message },
            { status: 500 }
          );
        } else {
          console.log('Auth metadata updated successfully');
        }
      }
    } catch (e) {
      console.warn('Non-critical error updating metadata:', e);
      // Non-critical error, continue
    }

    // Return success with updated user
    return NextResponse.json({
      user: updatedUser
    });
  } catch (error) {
    console.error('Unhandled error in POST /api/user/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PATCH handler that forwards to POST 
export async function PATCH(request: Request) {
  console.log('PATCH request received, forwarding to POST handler');
  return POST(request);
}

