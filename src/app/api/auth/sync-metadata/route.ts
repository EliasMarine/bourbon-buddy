import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Initialize admin client with full privileges
const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * API endpoint to sync user metadata with the database
 * This is useful for fixing inconsistencies between auth metadata and the User table
 */
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

    // Get user from database
    const { data: dbUser, error: dbError } = await supabase
      .from('User')
      .select('id, name, email, username, image, coverPhoto')
      .eq('id', user.id)
      .single();

    if (dbError) {
      console.error('Error fetching user from database:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch user from database' },
        { status: 500 }
      );
    }

    // Update auth metadata with values from database
    try {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata, // Preserve existing metadata
          name: dbUser.name,
          username: dbUser.username,
          avatar_url: dbUser.image,
          coverPhoto: dbUser.coverPhoto,
          is_registered: true,
          last_synced_at: new Date().toISOString()
        }
      });

      if (updateError) {
        console.error('Error updating auth metadata:', updateError);
        return NextResponse.json(
          { error: 'Failed to update auth metadata' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Exception during auth metadata update:', error);
      return NextResponse.json(
        { error: 'Failed to update auth metadata' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Metadata synchronized successfully',
      user: dbUser
    });
  } catch (error) {
    console.error('Error in sync-metadata endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 