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
      .select('id, email, username, image, "coverPhoto"')
      .eq('id', user.id)
      .single();
      
    if (userDataError) {
      console.error('Error fetching user data:', userDataError);
      return NextResponse.json(
        { error: 'Failed to fetch user data', details: userDataError.message },
        { status: 500 }
      );
    }
    
    // Analyze cover photo data
    const dbCoverPhoto = userData?.coverPhoto;
    const authCoverPhoto = user.user_metadata?.coverPhoto;
    
    // Function to safely truncate URLs for display
    const truncateUrl = (url: string | null | undefined) => {
      if (!url) return null;
      if (url.length <= 100) return url;
      return url.substring(0, 50) + '...' + url.substring(url.length - 50);
    };
    
    // Check for image URL generation
    const getCoverPhotoUrl = (url: string | null) => {
      if (!url) return null;
      
      // Check if storage path or full URL
      if (url.startsWith('http')) {
        return url;
      }
      
      // Handle storage paths
      if (url.includes('user-uploads/') || url.includes('/storage/v1/object/')) {
        if (!url.startsWith('http')) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          return `${supabaseUrl}/storage/v1/object/public/bourbon-buddy-prod/${url}`;
        }
        return url;
      }
      
      // Otherwise, construct API path
      return `/api/images/covers/${url}`;
    };
    
    // Now let's try to use a specific admin query for more details, if available
    let sqlData = null;
    let sqlError = null;
    
    try {
      // This might not work depending on permissions, so we'll catch errors
      const result = await supabase.rpc(
        'execute_sql',
        { 
          query: `
            SELECT 
              u."coverPhoto" AS db_cover_photo,
              au.raw_user_meta_data->>'coverPhoto' AS auth_cover_photo
            FROM 
              public."User" u
            JOIN
              auth.users au ON u.id = au.id
            WHERE u.id = '${user.id}'
          `
        }
      );
      
      sqlData = result.data;
      sqlError = result.error;
    } catch (e) {
      console.log('SQL query execution failed:', e);
      sqlError = { message: e instanceof Error ? e.message : String(e) };
    }
    
    return NextResponse.json({
      user_id: user.id,
      username: userData?.username,
      
      // Database data
      database: {
        coverPhotoPresent: !!dbCoverPhoto,
        coverPhotoLength: dbCoverPhoto?.length || 0,
        coverPhotoValue: truncateUrl(dbCoverPhoto),
        coverPhotoUrl: truncateUrl(getCoverPhotoUrl(dbCoverPhoto))
      },
      
      // Auth metadata
      auth: {
        coverPhotoPresent: !!authCoverPhoto,
        coverPhotoLength: authCoverPhoto?.length || 0,
        coverPhotoValue: truncateUrl(authCoverPhoto),
        coverPhotoUrl: truncateUrl(getCoverPhotoUrl(authCoverPhoto))
      },
      
      // Sync status
      sync: {
        match: dbCoverPhoto === authCoverPhoto,
        discrepancy: dbCoverPhoto !== authCoverPhoto ? {
          whatsMissing: !dbCoverPhoto ? 'database' : (!authCoverPhoto ? 'auth' : null),
          lengthDifference: (dbCoverPhoto?.length || 0) - (authCoverPhoto?.length || 0)
        } : null
      },
      
      // SQL data (raw values if available)
      sqlData: sqlError ? { error: sqlError.message } : sqlData,
      
      // Data for helping debug
      timestamps: {
        now: new Date().toISOString(),
        requestReceivedAt: Date.now()
      }
    });
  } catch (error) {
    console.error('Error in cover photo sync check:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 