import { NextResponse } from 'next/server';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies';

// Simple auth test endpoint that can be enabled in production for quick diagnostics
export async function GET() {
  const debugId = Math.random().toString(36).substring(2, 8);
  console.log(`[${debugId}] 🧪 Auth test endpoint called`);
  
  const isProd = process.env.NODE_ENV === 'production';
  
  try {
    // Basic environment check
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY),
    };
    
    console.log(`[${debugId}] 🔧 Environment info:`, envInfo);
    
    // Check cookies safely
    console.log(`[${debugId}] 🍪 Checking cookies`);
    let cookieNames: string[] = [];
    
    try {
      const cookieStore = cookies();
      
      // Try alternative methods to get cookies since the API has changed in different Next.js versions
      // This handles both the older synchronous and newer Promise-based cookies API
      if (typeof cookieStore === 'object' && cookieStore !== null) {
        if ('getAll' in cookieStore && typeof cookieStore.getAll === 'function') {
          // Traditional API
          const allCookies = cookieStore.getAll();
          cookieNames = allCookies.map(c => c.name);
        } else if (Symbol.iterator in cookieStore) {
          // Iterable API
          cookieNames = Array.from(cookieStore as Iterable<RequestCookie>).map(c => c.name);
        } else {
          console.log(`[${debugId}] ⚠️ Cookie store exists but can't access cookies`);
        }
      } else {
        console.log(`[${debugId}] ⚠️ Cookie store unavailable`);
      }
    } catch (cookieError) {
      console.error(`[${debugId}] ❌ Error accessing cookies:`, cookieError);
    }
    
    console.log(`[${debugId}] 🍪 Cookies found:`, {
      count: cookieNames.length,
      names: cookieNames
    });
    
    // Check NextAuth
    console.log(`[${debugId}] 🔐 Checking NextAuth session`);
    const nextAuthSession = await getServerSession();
    
    // Prepare the response with safe data
    const response = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: envInfo,
      cookies: {
        count: cookieNames.length,
        hasSupabaseAuth: cookieNames.some(name => name.startsWith('sb-')),
        hasNextAuth: cookieNames.some(name => name.startsWith('next-auth'))
      },
      auth: {
        nextAuthSession: nextAuthSession ? 'present' : 'not found',
        // Only include user ID in development
        nextAuthUser: isProd ? undefined : nextAuthSession?.user?.id
      }
    };
    
    console.log(`[${debugId}] ✅ Auth test complete`);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`[${debugId}] ❌ Auth test error:`, error);
    
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 