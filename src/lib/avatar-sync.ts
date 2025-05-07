'use server';

/**
 * Server-only utility to synchronize avatar URLs between Supabase Auth metadata
 * and the User database table.
 * 
 * This is meant to be used in API routes and server actions to ensure
 * that the user's avatar URL is properly synced between both systems.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Synchronizes a user's avatar URL between auth metadata and database
 * @param userId The user ID to synchronize
 * @param forceImageUrl Optional URL to explicitly set as the avatar URL
 */
export async function syncUserAvatar(userId: string, forceImageUrl?: string) {
  const cookieStore = await cookies();
  
  try {
    // Create Supabase client for server
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (error) {
              // The `setAll` method was called from a Server Component.
              // This can safely be ignored as it's not crucial for this operation
            }
          },
        },
      }
    );
    
    // Get current auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('Error getting auth user:', authError);
      return false;
    }
    
    // Get user from database
    const { data: dbUser, error: dbError } = await supabase
      .from('User')
      .select('id, image')
      .eq('id', userId)
      .single();
      
    if (dbError && !dbError.message.includes('no rows')) {
      console.error('Error getting database user:', dbError);
      return false;
    }
    
    // Determine the correct image URL to use
    let imageUrl = forceImageUrl || null;
    
    if (!imageUrl) {
      // If no forced URL, use existing values with preference for DB
      imageUrl = 
        dbUser?.image || 
        authUser.user_metadata?.avatar_url || 
        null;
    }
    
    // Only proceed if we have an image URL
    if (!imageUrl) {
      console.log('No image URL found to sync for user:', userId);
      return false;
    }
    
    let updated = false;
    
    // Update database if needed
    if (!dbUser || dbUser.image !== imageUrl) {
      const { error: updateDbError } = await supabase
        .from('User')
        .update({ 
          image: imageUrl,
          updatedAt: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (updateDbError) {
        console.error('Error updating database image:', updateDbError);
      } else {
        console.log('Updated database image for user:', userId);
        updated = true;
      }
    }
    
    // Update auth metadata if needed
    if (!authUser.user_metadata?.avatar_url || authUser.user_metadata.avatar_url !== imageUrl) {
      const { error: updateAuthError } = await supabase.auth.updateUser({
        data: {
          avatar_url: imageUrl,
          last_synced_at: new Date().toISOString()
        }
      });
      
      if (updateAuthError) {
        console.error('Error updating auth metadata:', updateAuthError);
      } else {
        console.log('Updated auth metadata for user:', userId);
        updated = true;
      }
    }
    
    return updated;
  } catch (error) {
    console.error('Error in syncUserAvatar:', error);
    return false;
  }
} 