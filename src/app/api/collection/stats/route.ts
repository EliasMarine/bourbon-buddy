import { createAppRouterSupabaseClient } from '@/lib/supabase';
import { getSupabaseClient } from '@/lib/supabase-singleton';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { generateDebugId } from '@/lib/debug-utils';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const debugId = generateDebugId();
  console.log(`[${debugId}] 📊 API: /api/collection/stats called`);
  
  try {
    // Get cookies for auth
    // Cookies are now handled internally by createAppRouterSupabaseClient
// // Cookies are now handled internally by createAppRouterSupabaseClient
// const cookieStore = cookies();;;
    
    // Create a Supabase client
    console.log(`[${debugId}] 🔨 Creating Supabase API client`);
    const startSupabaseClientTime = Date.now();
    
    // Use createServerClient with cookies to ensure proper auth
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
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (err) {
              console.error(`[${debugId}] Error setting cookies:`, err);
              // Continue anyway as this might be called from a route handler
              // where cookie setting isn't supported
            }
          }
        }
      }
    );
    
    console.log(`[${debugId}] ⏱️ Creating Supabase client took ${Date.now() - startSupabaseClientTime}ms`);
    
    // Get the authenticated user
    console.log(`[${debugId}] 🔐 Getting user from Supabase Auth`);
    const startAuthTime = Date.now();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log(`[${debugId}] ⏱️ Supabase getUser took ${Date.now() - startAuthTime}ms`);
    
    if (authError) {
      console.error(`[${debugId}] ❌ Auth error:`, authError);
      return NextResponse.json({
        totalSpirits: 0,
        favorites: 0,
        tastings: 0,
        error: 'Authentication failed'
      }, { status: 401 });
    }
    
    // Check for user ID
    let userId = user?.id;
    
    // If no user is authenticated, return zero values instead of error
    if (!userId) {
      console.log(`[${debugId}] ⚠️ No authenticated user found, returning default stats`);
      return NextResponse.json({
        totalSpirits: 0,
        favorites: 0,
        tastings: 0
      });
    }
    
    console.log(`[${debugId}] ✅ User authenticated with ID: ${userId.substring(0, 8)}...`);
    
    // Fetch total spirits count
    console.log(`[${debugId}] 📚 Fetching spirits count`);
    const startSpiritsTime = Date.now();
    const { count: totalSpirits, error: spiritsError } = await supabase
      .from('spirits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    console.log(`[${debugId}] ⏱️ Spirits count query took ${Date.now() - startSpiritsTime}ms`);
    
    if (spiritsError) {
      console.error(`[${debugId}] ❌ Error fetching spirits count:`, spiritsError);
      return NextResponse.json({
        totalSpirits: 0,
        favorites: 0,
        tastings: 0
      });
    }
    
    console.log(`[${debugId}] 📊 Found ${totalSpirits || 0} total spirits`);
    
    // Fetch favorites count
    console.log(`[${debugId}] 💖 Fetching favorites count`);
    const startFavoritesTime = Date.now();
    const { count: favorites, error: favoritesError } = await supabase
      .from('spirits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_favorite', true);
    console.log(`[${debugId}] ⏱️ Favorites count query took ${Date.now() - startFavoritesTime}ms`);
    
    if (favoritesError) {
      console.error(`[${debugId}] ❌ Error fetching favorites count:`, favoritesError);
    } else {
      console.log(`[${debugId}] 📊 Found ${favorites || 0} favorite spirits`);
    }
    
    // Fetch tastings count (if there's a tastings table)
    let tastings = 0;
    try {
      console.log(`[${debugId}] 🥃 Fetching tastings count`);
      const startTastingsTime = Date.now();
      const { count, error: tastingsError } = await supabase
        .from('tastings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      console.log(`[${debugId}] ⏱️ Tastings count query took ${Date.now() - startTastingsTime}ms`);
      
      if (!tastingsError && count !== null) {
        tastings = count;
        console.log(`[${debugId}] 📊 Found ${tastings} tastings`);
      } else if (tastingsError) {
        console.error(`[${debugId}] ❌ Error fetching tastings count:`, tastingsError);
      }
    } catch (error) {
      // If tastings table doesn't exist, we'll just use 0
      console.error(`[${debugId}] ❌ Error in tastings query:`, error);
    }
    
    // Return the stats
    const response = {
      totalSpirits: totalSpirits || 0,
      favorites: favorites || 0,
      tastings: tastings || 0
    };
    
    console.log(`[${debugId}] ✅ Returning stats:`, response);
    return NextResponse.json(response);
  } catch (error) {
    console.error(`[${debugId}] 🚨 Unhandled error in collection stats endpoint:`, error);
    // Add stack trace for better debugging
    if (error instanceof Error) {
      console.error(`[${debugId}] 📚 Stack trace:`, error.stack);
    }
    return NextResponse.json({
      totalSpirits: 0,
      favorites: 0,
      tastings: 0,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error)
    });
  }
} 