import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateDebugId } from '@/lib/supabase';

export async function GET(req: Request) {
  const debugId = generateDebugId();
  console.log(`[${debugId}] 📊 API: /api/collection/stats called`);
  
  try {
    // Get the session
    console.log(`[${debugId}] 🔐 Getting NextAuth session`);
    const startNextAuthTime = Date.now();
    const session = await getServerSession();
    console.log(`[${debugId}] ⏱️ NextAuth getServerSession took ${Date.now() - startNextAuthTime}ms`);
    console.log(`[${debugId}] 🔑 NextAuth session: ${session ? "Found" : "Not found"}`);
    
    if (session?.user) {
      console.log(`[${debugId}] 👤 User from NextAuth: ${session.user.id?.substring(0, 8) || 'unknown'}...`);
    }
    
    console.log(`[${debugId}] 🔨 Creating Supabase server client`);
    const startSupabaseClientTime = Date.now();
    const supabase = createSupabaseServerClient();
    console.log(`[${debugId}] ⏱️ Creating Supabase client took ${Date.now() - startSupabaseClientTime}ms`);
    
    // Check for supabase session if NextAuth session not found
    let userId = session?.user?.id;
    
    if (!userId) {
      console.log(`[${debugId}] 🔍 No NextAuth session, checking Supabase session`);
      const startSupabaseAuthTime = Date.now();
      const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();
      console.log(`[${debugId}] ⏱️ Supabase getSession took ${Date.now() - startSupabaseAuthTime}ms`);
      
      if (sessionError) {
        console.error(`[${debugId}] ❌ Supabase session error:`, sessionError);
      }
      
      console.log(`[${debugId}] 🔑 Supabase session: ${supabaseSession ? "Found" : "Not found"}`);
      userId = supabaseSession?.user?.id;
      
      if (userId) {
        console.log(`[${debugId}] 👤 User from Supabase: ${userId.substring(0, 8)}...`);
      }
    }
    
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