import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET - Sync user metadata between auth and database
 * This ensures that avatar_url, name and other fields stay in sync
 */
export async function GET() {
  try {
    // Create a Supabase client for route handlers (using cookies)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async getAll() {
            return (await cookies()).getAll();
          },
          async setAll(cookiesToSet) {
            try {
              const cookieStore = await cookies();
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
              console.warn('Could not set cookies in sync-metadata endpoint');
            }
          },
        },
      }
    );

    // Add cache control headers to prevent caching of this response
    const headers = new Headers({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });

    // Get current user data
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Error getting user for metadata sync:', error);
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401, headers }
      );
    }

    console.log('Syncing metadata for user:', user.id);

    // First, get existing user data from the database
    const { data: userData, error: fetchError } = await supabase
      .from('User')
      .select('id, name, email, username, image')
      .eq('id', user.id)
      .single();

    if (fetchError && !fetchError.message.includes('no rows')) {
      console.error('Error fetching user data for metadata sync:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500, headers }
      );
    }

    // Object to track which direction we're syncing (DB → Auth or Auth → DB)
    const updates = {
      dbToAuth: {} as Record<string, any>,
      authToDb: {} as Record<string, any>,
    };

    // If user exists in DB, check for fields to sync
    if (userData) {
      // Add timestamp for better debugging
      const syncTime = new Date().toISOString();
      console.log(`[${syncTime}] Syncing data for user ${user.id}`);
      
      // Check if DB has image but auth doesn't have avatar_url
      if (userData.image && (!user.user_metadata?.avatar_url || user.user_metadata.avatar_url !== userData.image)) {
        console.log('Syncing image from DB to Auth:', userData.image);
        updates.dbToAuth.avatar_url = userData.image;
      }

      // Check if auth has avatar_url but DB doesn't have image or they don't match
      if (user.user_metadata?.avatar_url && (!userData.image || userData.image !== user.user_metadata.avatar_url)) {
        console.log('Syncing avatar_url from Auth to DB:', user.user_metadata.avatar_url);
        updates.authToDb.image = user.user_metadata.avatar_url;
      }

      // Do the same for name, username, etc.
      if (userData.name && (!user.user_metadata?.name || user.user_metadata.name !== userData.name)) {
        updates.dbToAuth.name = userData.name;
      }

      if (user.user_metadata?.name && (!userData.name || userData.name !== user.user_metadata.name)) {
        updates.authToDb.name = user.user_metadata.name;
      }
    } else {
      // If user doesn't exist in DB yet, prepare to create it with auth metadata
      if (user.user_metadata?.avatar_url) {
        updates.authToDb.image = user.user_metadata.avatar_url;
      }
      
      if (user.user_metadata?.name) {
        updates.authToDb.name = user.user_metadata.name;
      }
      
      // Add other necessary fields for user creation
      updates.authToDb.id = user.id;
      updates.authToDb.email = user.email;
    }

    // Perform the updates if needed
    let dbUpdateResult = null;
    let authUpdateResult = null;
    
    // 1. Update database if needed
    if (Object.keys(updates.authToDb).length > 0) {
      console.log('Updating DB from auth metadata:', updates.authToDb);
      
      if (userData) {
        // Update existing user
        const { data, error: updateError } = await supabase
          .from('User')
          .update({
            ...updates.authToDb,
            updatedAt: new Date().toISOString()
          })
          .eq('id', user.id)
          .select();
          
        if (updateError) {
          console.error('Error updating user in database:', updateError);
        } else {
          dbUpdateResult = data;
          console.log('DB update successful:', data);
        }
      } else {
        // Insert new user
        const { data, error: insertError } = await supabase
          .from('User')
          .insert({
            ...updates.authToDb,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            username: user.email?.split('@')[0] || `user_${user.id.substring(0, 8)}`
          })
          .select();
          
        if (insertError) {
          console.error('Error inserting user in database:', insertError);
        } else {
          dbUpdateResult = data;
          console.log('DB insert successful:', data);
        }
      }
    }
    
    // 2. Update auth metadata if needed
    if (Object.keys(updates.dbToAuth).length > 0) {
      console.log('Updating auth metadata from DB:', updates.dbToAuth);
      
      const { data, error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          ...updates.dbToAuth,
          last_synced_at: new Date().toISOString()
        }
      });
      
      if (authUpdateError) {
        console.error('Error updating auth metadata:', authUpdateError);
      } else {
        authUpdateResult = data;
        console.log('Auth metadata update successful');
      }
    }

    // 3. Verify the changes by fetching the latest user data
    let finalUserData = null;
    if (dbUpdateResult || authUpdateResult) {
      // Re-fetch user data to confirm changes
      const { data: verifyData, error: verifyError } = await supabase
        .from('User')
        .select('id, name, email, username, image')
        .eq('id', user.id)
        .single();
        
      if (!verifyError) {
        finalUserData = verifyData;
        console.log('Verified final user data after sync:', finalUserData);
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Metadata synchronized successfully',
      dbUpdated: Object.keys(updates.authToDb).length > 0,
      authUpdated: Object.keys(updates.dbToAuth).length > 0,
      user: finalUserData || dbUpdateResult?.[0] || userData,
      timestamp: new Date().toISOString()
    }, { headers });
  } catch (error) {
    console.error('Error in sync-metadata API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 