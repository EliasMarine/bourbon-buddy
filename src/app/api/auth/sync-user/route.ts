import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Initialize admin client with full privileges
const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const supabase = await createServerComponentClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Query the user from the database
    const { data, error: checkError } = await supabase
      .from('User')
      .select('id, name, email, username, image')
      .eq('id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError);
    }

    return NextResponse.json({
      isRegistered: !!data,
      user: data || null
    });
  } catch (err) {
    console.error('Error in check status:', err);
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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Syncing user to database:', user.id);

    // Get user profile data from auth metadata
    const name = user.user_metadata?.full_name || 
                 user.user_metadata?.name || 
                 user.email?.split('@')[0] || 
                 'New User';
    
    const email = user.email || '';
    const username = user.user_metadata?.username || 
                     user.user_metadata?.preferred_username || 
                     email?.split('@')[0] || 
                     `user_${user.id.substring(0, 8)}`;
    
    const image = user.user_metadata?.avatar_url || 
                  user.user_metadata?.picture || 
                  null;

    // Check if user exists in the database
    const { data: existingUser, error: checkError } = await supabase
      .from('User')
      .select('id, name, email, username, image')
      .eq('id', user.id)
      .single();

    // Merge existing data with new data to prevent overriding existing fields
    let userData = {
      id: user.id,
      name,
      email,
      username,
      image,
    };

    if (existingUser) {
      userData = {
        ...userData,
        // Preserve existing values if they exist and new values are empty/null
        name: existingUser.name || name, // Keep existing name if it exists
        username: existingUser.username || username,
        image: existingUser.image || image,
      };
    }

    // Update or insert user information
    let result;
    if (existingUser) {
      // Update existing user
      result = await supabase
        .from('User')
        .update(userData)
        .eq('id', user.id);
    } else {
      // Insert new user
      result = await supabase
        .from('User')
        .insert(userData);
    }

    if (result.error) {
      console.error('Error syncing user to database:', result.error);
      return NextResponse.json(
        { error: 'Failed to sync user' },
        { status: 500 }
      );
    }

    // Fetch the updated user record to send back in the response
    const { data: updatedUser, error: fetchError } = await supabase
      .from('User')
      .select('id, name, email, username, image')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated user:', fetchError);
    }

    // Use admin client to update user metadata to mark as registered
    // and keep auth metadata in sync with database
    try {
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          is_registered: true,
          last_synced_at: new Date().toISOString(),
          name: updatedUser?.name || userData.name, // Use the final name
          username: updatedUser?.username || userData.username,
          avatar_url: updatedUser?.image || userData.image
        }
      });
    } catch (adminError) {
      console.error('Admin client error:', adminError);
      // Continue even if admin update fails
    }

    return NextResponse.json({
      success: true,
      message: 'User synced successfully',
      user: updatedUser || userData
    });
  } catch (err) {
    console.error('Error in sync user:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
