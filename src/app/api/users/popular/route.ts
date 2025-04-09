import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// Define type for raw query result
type PopularUser = {
  id: string;
  name: string | null;
  username: string;
  email: string;
  image: string | null;
  spiritsCount: bigint; // SQL COUNT returns bigint
};

// GET /api/users/popular - Get users with the most spirits in their collection
export async function GET(request: Request) {
  try {
    const debugId = Math.random().toString(36).substring(2, 8);
    console.log(`[${debugId}] 🔍 Fetching popular users`);
    
    // Try to get session from NextAuth first
    const session = await getServerSession(authOptions);
    let userEmail: string | undefined;
    
    // If no NextAuth session, try to get from Supabase
    if (!session?.user?.email) {
      console.log(`[${debugId}] ℹ️ No NextAuth session, checking Supabase`);
      
      // Create Supabase server client
      const supabase = createSupabaseServerClient();
      
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
      console.log(`[${debugId}] ✅ Found NextAuth session for user: ${session.user.email}`);
      userEmail = session.user.email;
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
      
      // Use a single optimized query with JOIN and COUNT
      // This avoids prepared statement conflicts by reducing query count
      const users = await prisma.$queryRaw<PopularUser[]>`
        SELECT 
          u.id, 
          u.name, 
          u.username, 
          u.email, 
          u.image, 
          COUNT(s.id) as "spiritsCount"
        FROM "User" u
        LEFT JOIN "Spirit" s ON s."ownerId" = u.id
        WHERE u.email != ${userEmail}
        GROUP BY u.id, u.name, u.username, u.email, u.image
        HAVING COUNT(s.id) > 0
        ORDER BY "spiritsCount" DESC
        LIMIT 12
      `;
      
      // Convert bigint to number for JSON serialization
      const formattedUsers = users.map(user => ({
        ...user,
        spiritsCount: Number(user.spiritsCount)
      }));
      
      console.log(`[${debugId}] ✅ Found ${formattedUsers.length} popular users`);
      return NextResponse.json({ users: formattedUsers });
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
    
    // No manual disconnect needed - handled by global prisma setup
    
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch popular users' },
      { status: 500 }
    );
  }
} 