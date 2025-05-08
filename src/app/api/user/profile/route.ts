import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';
import { validateCsrfToken } from '@/lib/csrf';
import { SupabaseClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/supabase-js';

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

export async function POST(request: Request) {
  try {
    // Remove CSRF bypass - always validate CSRF tokens in production
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
    
    console.log('Creating Supabase client for profile update...');
    const supabase = await createServerComponentClient();
    
    console.log('Getting user from auth...');
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Failed to get authenticated user:', error);
      return NextResponse.json(
        { message: 'Unauthorized', details: error?.message || 'No user found' },
        { status: 401 }
      );
    }

    console.log('Authenticated user found:', { id: user.id, email: user.email });
    
    // Get the request data
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
    
    // Get the fields to update
    const { image, coverPhoto, name, username } = requestData;
    
    // Check coverPhoto URL length - PostgreSQL text columns should handle large values,
    // but some configurations might have limits
    if (coverPhoto && coverPhoto.length > 1000) {
      console.warn(`Cover photo URL is very long (${coverPhoto.length} chars). This might cause issues with some database configurations.`);
      // For now, we'll try to proceed, but log the URL length for debugging
    }
    
    // Build update object with only the provided fields
    const updateData: Record<string, any> = {};
    if (image !== undefined) updateData.image = image;
    if (coverPhoto !== undefined) {
      // Get just the path portion for better storage in DB (optional)
      try {
        // Extract the URL path, which is typically shorter
        const parsedUrl = new URL(coverPhoto);
        const urlPath = parsedUrl.pathname; // e.g., /storage/v1/object/public/...
        
        console.log('Parsed cover photo URL:', {
          original: coverPhoto.substring(0, 50) + '...',
          parsed: urlPath,
          originalLength: coverPhoto.length,
          parsedLength: urlPath.length,
        });
        
        // Store the full URL, but log the parsing for debugging
        updateData.coverPhoto = coverPhoto;
      } catch (e) {
        console.warn('Unable to parse cover photo URL:', e);
        // Still use the original URL
        updateData.coverPhoto = coverPhoto;
      }
    }
    if (name !== undefined) updateData.name = name;
    if (username !== undefined) updateData.username = username;
    
    // Add timestamp
    updateData.updatedAt = new Date().toISOString();
    
    console.log('Updating user in database with:', { 
      fields: Object.keys(updateData).join(', '),
      userId: user.id,
      coverPhotoLength: updateData.coverPhoto ? updateData.coverPhoto.length : 0,
      updatedAt: updateData.updatedAt
    });
    
    // Verify we have data to update
    if (Object.keys(updateData).length === 1 && updateData.updatedAt) {
      console.warn('No actual fields to update, only timestamp');
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    // Get database schema for debugging
    try {
      console.log('Checking User table schema for debugging...');
      const { data: tableInfo, error: schemaError } = await supabase
        .rpc('get_column_info', { table_name: 'User' });
      
      if (schemaError) {
        console.warn('Could not get table schema (non-critical):', schemaError);
      } else if (tableInfo) {
        // Find coverPhoto column info
        const coverPhotoColumn = tableInfo.find((col: any) => col.column_name === 'coverPhoto');
        if (coverPhotoColumn) {
          console.log('Cover photo column info:', coverPhotoColumn);
        } else {
          console.warn('Cover photo column not found in schema');
        }
      }
    } catch (schemaErr) {
      console.warn('Schema check failed (non-critical):', schemaErr);
    }

    // Update the user in the database
    try {
      // First, attempt to retrieve the current user to verify access
      const { data: userCheck, error: getUserError } = await supabase
        .from('User')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (getUserError) {
        console.error('Error verifying user exists:', getUserError);
        return NextResponse.json(
          { error: 'Failed to verify user exists', details: getUserError.message, code: getUserError.code },
          { status: 500 }
        );
      }
      
      if (!userCheck) {
        console.error('User not found or RLS permission denied');
        return NextResponse.json(
          { error: 'User not found in database' },
          { status: 404 }
        );
      }
      
      console.log('User verified, attempting database update...');

      // Skip the test update and go directly to the full update
      console.log('Attempting full update directly...');
      
      // Try the update with URL truncation if needed
      const { updatedUser, updateError } = await updateUserWithLimitedCoverPhotoUrl(
        supabase, 
        user, 
        updateData
      );
      
      if (updateError) {
        console.error('Error updating user profile:', updateError);
        
        // Add more detailed diagnostics about the update that failed
        console.error('Update details:', {
          userId: user.id,
          updateFields: Object.keys(updateData),
          updateDataSizes: Object.entries(updateData).reduce((acc, [key, value]) => {
            acc[key] = typeof value === 'string' ? value.length : 'non-string';
            return acc;
          }, {} as Record<string, any>)
        });
        
        // Create a user-friendly response without type issues
        let statusCode = 500;
        let errorMessage = 'Failed to update profile';
        
        // Check for specific PostgrestError properties
        if ('code' in updateError) {
          // This is a PostgrestError
          if (typeof updateError.code === 'string' && updateError.code.startsWith('4')) {
            statusCode = 403;
          }
          errorMessage = updateError.message || errorMessage;
        }
        
        return NextResponse.json(
          { 
            error: errorMessage,
            field: 'coverPhoto',
            suggestion: 'Try using a shorter image path or contact support'
          },
          { status: statusCode }
        );
      }

      if (!updatedUser) {
        console.error('No updated user returned from database update');
        return NextResponse.json(
          { error: 'Failed to update profile - no user returned' },
          { status: 500 }
        );
      }

      console.log('Database update successful:', { 
        updatedFields: Object.keys(updateData).join(', '),
        updatedUserId: updatedUser.id,
        hasCoverPhoto: !!updatedUser.coverPhoto,
        coverPhotoLength: updatedUser.coverPhoto ? updatedUser.coverPhoto.length : 0
      });

      // Also update user metadata in auth to keep it in sync
      try {
        console.log('Updating auth metadata...');
        // Only update certain fields in metadata to avoid overwriting other metadata
        const metadataUpdate: Record<string, any> = {};
        if (image !== undefined) metadataUpdate.avatar_url = image;
        if (name !== undefined) metadataUpdate.name = name;
        if (username !== undefined) metadataUpdate.username = username;
        if (coverPhoto !== undefined) metadataUpdate.coverPhoto = coverPhoto;
        
        // Update metadata only if we have fields to update
        if (Object.keys(metadataUpdate).length > 0) {
          const { data: metadataData, error: metadataUpdateError } = await supabase.auth.updateUser({
            data: metadataUpdate
          });
          
          if (metadataUpdateError) {
            console.error('Warning: Failed to update auth metadata:', metadataUpdateError);
            // Continue without failing the request
          } else {
            console.log('Auth metadata updated successfully');
          }
        }
      } catch (metadataError) {
        console.error('Exception updating user metadata:', metadataError);
        // Continue without failing the request
      }

      // Return the updated user
      console.log('Returning success response with updated user');
      return NextResponse.json({
        user: updatedUser
      });
    } catch (dbError) {
      console.error('Uncaught database error:', dbError);
      return NextResponse.json(
        { error: 'Database update failed', details: dbError instanceof Error ? dbError.message : String(dbError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unhandled error in POST /api/user/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Add PATCH handler that uses the same implementation as POST
export async function PATCH(request: Request) {
  // This handler simply forwards to the POST handler for now
  return POST(request);
}
