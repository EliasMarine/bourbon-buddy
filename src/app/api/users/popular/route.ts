import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { createClient } from '@/utils/supabase/server';

// Define type for query result
type PopularUser = {
  id: string;
  name: string | null;
  username: string;
  email: string;
  image: string | null;
  spiritsCount: number;
};

// GET /api/users/popular - Get users with the most spirits in their collection
export async function GET(request: Request) {
  try {
    const debugId = Math.random().toString(36).substring(2, 8);
    console.log(`[${debugId}] 🔍 Fetching popular users`);
    
    // Try to get session from Supabase
    const user = await getCurrentUser();
    let userEmail: string | undefined;
    
    // If no user from getCurrentUser, try another approach
    if (!user?.email) {
      console.log(`[${debugId}] ℹ️ No user from getCurrentUser, checking Supabase directly`);
      
      // Create Supabase server client
      const supabase = await createClient();
      
      try {
        const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error(`[${debugId}] ❌ Supabase auth error:`, error);
        }
        
        if (!supabaseSession) {
          console.log(`[${debugId}] ⚠️ No authenticated session found`);
          
          // Try to see if we have a user session via a different method
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error(`[${debugId}] ❌ Failed to get user:`, userError);
          } else if (userData?.user?.email) {
            console.log(`[${debugId}] ✅ Found user through auth.getUser: ${userData.user.email}`);
            userEmail = userData.user.email;
          } else {
            // Return a helpful error message
            return NextResponse.json(
              { 
                error: 'Unauthorized',
                message: 'Authentication required to view popular users'
              },
              { status: 401 }
            );
          }
        } else {
          console.log(`[${debugId}] ✅ Found Supabase session for user: ${supabaseSession.user.email}`);
          userEmail = supabaseSession.user.email;
        }
      } catch (error) {
        console.error(`[${debugId}] ❌ Unexpected error checking Supabase auth:`, error);
        // Return a helpful error message
        return NextResponse.json(
          { 
            error: 'Server Error',
            message: 'Authentication check failed'
          },
          { status: 500 }
        );
      }
    } else {
      console.log(`[${debugId}] ✅ Found user session for user: ${user.email}`);
      userEmail = user.email;
    }
    
    // Skip the authentication requirement if we're in development 
    // and we have the debug flag enabled
    if (!userEmail && process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH === 'true') {
      console.log(`[${debugId}] 🔧 Debug mode: proceeding without authentication`);
      userEmail = 'debug@example.com'; // Use a placeholder
    }

    // If we still don't have a user email, return unauthorized
    if (!userEmail && process.env.NODE_ENV !== 'development') {
      console.log(`[${debugId}] ⛔ No authenticated user found after all checks`);
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Authentication required to view popular users'
        },
        { status: 401 }
      );
    } else if (!userEmail) {
      // In development, use a placeholder email
      console.log(`[${debugId}] 🛠️ Development mode: proceeding with placeholder user`);
      userEmail = 'dev@example.com';
    }

    try {
      console.log(`[${debugId}] 🔍 Executing database query to find popular users`);
      
      // Create Supabase client for the database query
      const supabase = await createClient();
      
      // Use Supabase's RPC to run a complex query
      const { data: users, error } = await supabase.rpc(
        'get_popular_users',
        { current_user_email: userEmail, limit_count: 12 }
      );
      
      if (error) {
        console.error(`[${debugId}] ❌ Supabase RPC error:`, error);
        throw error;
      }
      
      // If we don't have the RPC function yet, fallback to a normal query
      if (!users || users.length === 0) {
        console.log(`[${debugId}] ⚠️ RPC function not found or returned no results, trying direct query`);
        
        // Run the query directly
        const { data: queryResult, error: queryError } = await supabase
          .from('User')
          .select(`
            id, 
            name, 
            username, 
            email, 
            image, 
            Spirit!inner (id)
          `)
          .neq('email', userEmail)
          .order('created_at', { ascending: false });
          
        if (queryError) {
          console.error(`[${debugId}] ❌ Supabase query error:`, queryError);
          throw queryError;
        }
        
        // Process results to count spirits and format data
        const formattedUsers = queryResult 
          ? queryResult.map(user => ({
              id: user.id,
              name: user.name,
              username: user.username,
              email: user.email,
              image: user.image,
              spiritsCount: Array.isArray(user.Spirit) ? user.Spirit.length : 0
            }))
            .filter(user => user.spiritsCount > 0)
            .sort((a, b) => b.spiritsCount - a.spiritsCount)
            .slice(0, 12)
          : [];
        
        console.log(`[${debugId}] ✅ Found ${formattedUsers.length} popular users using direct query`);
        return NextResponse.json({ users: formattedUsers });
      }
      
      console.log(`[${debugId}] ✅ Found ${users.length} popular users using RPC`);
      return NextResponse.json({ users });
    } catch (queryError) {
      console.error(`[${debugId}] ❌ Database query error:`, queryError);
      
      // Return a fallback response with empty data for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${debugId}] 🛠️ Development mode: returning mock data`);
        return NextResponse.json({ users: [] });
      }
      
      return NextResponse.json(
        { error: 'Database Error', message: 'Failed to fetch popular users' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching popular users:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch popular users' },
      { status: 500 }
    );
  }
} 