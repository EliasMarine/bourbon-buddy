import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// GET /api/spirits/featured - Get featured spirits from different users
export async function GET(
  request: Request,
) {
  try {
    const debugId = Math.random().toString(36).substring(2, 8);
    console.log(`[${debugId}] 🔍 Fetching featured spirits`);
    
    // Parse request URL to get query parameters
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const subcategory = url.searchParams.get('subcategory');
    const limit = parseInt(url.searchParams.get('limit') || '24');
    
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
                message: 'Authentication required to view featured spirits'
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
    if (!userEmail) {
      console.log(`[${debugId}] ⛔ No authenticated user found after all checks`);
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Authentication required to view featured spirits'
        },
        { status: 401 }
      );
    }

    // Build query conditions
    const whereConditions: any = {
      // Don't include current user's spirits
      owner: {
        NOT: {
          email: userEmail
        }
      },
      // Either has a rating or has an image
      OR: [
        { rating: { gte: 3 } },
        { NOT: { imageUrl: null } }
      ]
    };

    // Add category and subcategory filters if provided
    if (category) {
      whereConditions.category = category;
    }
    
    if (subcategory) {
      whereConditions.type = subcategory;
    }

    // Get spirits with high ratings or recently added
    const spirits = await prisma.spirit.findMany({
      select: {
        id: true,
        name: true,
        brand: true,
        type: true,
        category: true,
        imageUrl: true,
        rating: true,
        ownerId: true,
        owner: {
          select: {
            name: true,
            image: true,
          }
        },
        createdAt: true,
      },
      where: whereConditions,
      orderBy: [
        { rating: 'desc' },
        { createdAt: 'desc' }
      ],
      take: Math.min(limit, 50) // Limit maximum to 50 for performance
    });

    console.log(`[${debugId}] ✅ Found ${spirits.length} featured spirits`);
    return NextResponse.json({ spirits });
  } catch (error) {
    console.error('Error fetching featured spirits:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch featured spirits' },
      { status: 500 }
    );
  }
} 