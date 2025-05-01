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

    // Get user profile data from auth metadata with better fallbacks
    const getName = () => {
      const metadata = user.user_metadata || {};
      return metadata.full_name || 
             metadata.name || 
             user.email?.split('@')[0] || 
             'New User';
    };
    
    const getUsername = () => {
      const metadata = user.user_metadata || {};
      return metadata.username || 
             metadata.preferred_username || 
             user.email?.split('@')[0] || 
             `user_${user.id.substring(0, 8)}`;
    };
    
    const getImage = () => {
      const metadata = user.user_metadata || {};
      return metadata.avatar_url || 
             metadata.picture || 
             null;
    };
    
    // Prepare new user data with proper fallbacks
    const name = getName();
    const email = user.email;
    const username = getUsername();
    const image = getImage();

    // Check if user exists in the database and get current values
    const { data: existingUser, error: checkError } = await supabase
      .from('User')
      .select('id, name, email, username, image')
      .eq('id', user.id)
      .single();

    // Prepare the data to update, preserving existing values when new values are empty
    let userData: Record<string, any> = {};
    
    if (existingUser) {
      // For existing users, only update fields that have values and preserve existing data
      userData = {
        // Preserve existing name if new name is empty or 'New User' or matches email username
        name: name && name !== 'New User' && name !== user.email?.split('@')[0] 
          ? name 
          : existingUser.name || name,
          
        // Always keep email up to date
        email: email || existingUser.email,
        
        // Preserve existing username if new username is empty or matches email username
        username: username && username !== user.email?.split('@')[0] 
          ? username 
          : existingUser.username || username,
          
        // Preserve existing image if new image is empty
        image: image || existingUser.image,
        
        // Add updated timestamp
        updated_at: new Date().toISOString()
      };
    } else {
      // For new users, use all available data
      userData = {
        id: user.id,
        name,
        email,
        username,
        image,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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

    // Get the final user data to ensure we have the most up-to-date information
    const { data: finalUserData, error: finalUserError } = await supabase
      .from('User')
      .select('id, name, email, username, image')
      .eq('id', user.id)
      .single();
      
    if (finalUserError) {
      console.error('Error fetching updated user profile:', finalUserError);
    }
    
    // Final user data to use for auth metadata sync
    const finalUser = finalUserError ? userData : finalUserData;

    // Use admin client to update user metadata to mark as registered and sync back to auth
    try {
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          is_registered: true,
          last_synced_at: new Date().toISOString(),
          // Sync database values back to auth metadata for consistency
          name: finalUser.name,
          username: finalUser.username,
          avatar_url: finalUser.image
        }
      });
      
      console.log('User metadata updated in Auth');
    } catch (adminError) {
      console.error('Admin client error:', adminError);
      // Continue even if admin update fails
    }

    return NextResponse.json({
      success: true,
      message: 'User synced successfully',
      user: finalUser
    });
  } catch (err) {
    console.error('Error in sync user:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
