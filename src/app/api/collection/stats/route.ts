import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    // Get the session
    const session = await getServerSession();
    console.log("NextAuth session:", session ? "Found" : "Not found");
    
    const supabase = createSupabaseServerClient();
    
    // Check for supabase session if NextAuth session not found
    let userId = session?.user?.id;
    
    if (!userId) {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      console.log("Supabase session:", supabaseSession ? "Found" : "Not found");
      userId = supabaseSession?.user?.id;
    }
    
    // If no user is authenticated, return zero values instead of error
    if (!userId) {
      console.log('No authenticated user found, returning default stats');
      return NextResponse.json({
        totalSpirits: 0,
        favorites: 0,
        tastings: 0
      });
    }
    
    console.log(`User authenticated with ID: ${userId.substring(0, 8)}...`);
    
    // Fetch total spirits count
    const { count: totalSpirits, error: spiritsError } = await supabase
      .from('spirits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (spiritsError) {
      console.error('Error fetching spirits count:', spiritsError);
      return NextResponse.json({
        totalSpirits: 0,
        favorites: 0,
        tastings: 0
      });
    }
    
    // Fetch favorites count
    const { count: favorites, error: favoritesError } = await supabase
      .from('spirits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_favorite', true);
    
    if (favoritesError) {
      console.error('Error fetching favorites count:', favoritesError);
    }
    
    // Fetch tastings count (if there's a tastings table)
    let tastings = 0;
    try {
      const { count, error: tastingsError } = await supabase
        .from('tastings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (!tastingsError && count !== null) {
        tastings = count;
      }
    } catch (error) {
      // If tastings table doesn't exist, we'll just use 0
      console.error('Error fetching tastings count:', error);
    }
    
    // Return the stats
    return NextResponse.json({
      totalSpirits: totalSpirits || 0,
      favorites: favorites || 0,
      tastings: tastings || 0
    });
  } catch (error) {
    console.error('Error in collection stats endpoint:', error);
    return NextResponse.json({
      totalSpirits: 0,
      favorites: 0,
      tastings: 0
    });
  }
} 