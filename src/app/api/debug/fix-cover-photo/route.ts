import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';
import { validateCsrfToken } from '@/lib/csrf';

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
    
    // Validate CSRF token
    const csrfToken = request.headers.get('x-csrf-token');
    if (!csrfToken) {
      console.error('Missing CSRF token');
      return NextResponse.json(
        { error: 'Missing CSRF token' },
        { status: 403 }
      );
    }
    
    // Check if we're in development mode
    const isDev = process.env.NODE_ENV === 'development';
    
    // In production, validate CSRF token, in dev allow it to pass
    if (!isDev) {
      const isValidCsrfToken = await validateCsrfToken(request);
      if (!isValidCsrfToken) {
        console.error('Invalid CSRF token');
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    } else {
      console.log('Development mode: Skipping CSRF validation');
    }
    
    // Get request body containing the URL to use
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Expected JSON body with coverPhotoUrl field' },
        { status: 400 }
      );
    }
    
    // If no URL provided, get current URL from database or auth
    let coverPhotoUrl = requestBody.coverPhotoUrl;
    
    if (!coverPhotoUrl) {
      // Get user data from database
      const { data: userData } = await supabase
        .from('User')
        .select('"coverPhoto"')
        .eq('id', user.id)
        .single();
        
      // Try to get URL from database, then fallback to auth
      coverPhotoUrl = userData?.coverPhoto || user.user_metadata?.coverPhoto;
      
      if (!coverPhotoUrl) {
        return NextResponse.json(
          { error: 'No cover photo URL provided and none found in database or auth metadata' },
          { status: 400 }
        );
      }
    }
    
    console.log(`Attempting to synchronize cover photo URL: ${coverPhotoUrl}`);
    
    // Update database first
    const { error: dbError } = await supabase
      .from('User')
      .update({ "coverPhoto": coverPhotoUrl })
      .eq('id', user.id);
      
    if (dbError) {
      console.error('Error updating database:', dbError);
      return NextResponse.json(
        { error: 'Failed to update database', details: dbError.message },
        { status: 500 }
      );
    }
    
    console.log('Successfully updated database');
    
    // Now update auth metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        coverPhoto: coverPhotoUrl
      }
    });
    
    if (authError) {
      console.error('Error updating auth metadata:', authError);
      return NextResponse.json(
        { error: 'Failed to update auth metadata', details: authError.message },
        { status: 500 }
      );
    }
    
    console.log('Successfully updated auth metadata');
    
    // Get updated user data to verify changes
    const { data: updatedUser } = await supabase.auth.getUser();
    const { data: updatedData } = await supabase
      .from('User')
      .select('"coverPhoto"')
      .eq('id', user.id)
      .single();
      
    return NextResponse.json({
      success: true,
      message: 'Cover photo URL synchronized successfully',
      initialUrl: coverPhotoUrl,
      updates: {
        database: {
          success: !dbError,
          currentValue: updatedData?.coverPhoto
        },
        auth: {
          success: !authError,
          currentValue: updatedUser.user?.user_metadata?.coverPhoto
        }
      }
    });
    
  } catch (error) {
    console.error('Error in fix-cover-photo endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 