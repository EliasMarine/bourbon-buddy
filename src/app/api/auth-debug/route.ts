import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSsrServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateDebugId } from '@/lib/supabase';
import { RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies';

// Only allow this endpoint in development by default, but can be enabled in production for debugging
const ALLOW_IN_PROD = process.env.DEBUG_AUTH === 'true';

/**
 * Safely retrieves cookies using the Next.js cookies() API
 * Works with both the older synchronous and newer Promise-based API
 */
async function getCookies(debugId: string) {
  try {
    const cookieStore = cookies();
    let allCookies: { name: string; value: string }[] = [];
    
    // Try alternative methods to get cookies since the API has changed in different Next.js versions
    if (typeof cookieStore === 'object' && cookieStore !== null) {
      if ('getAll' in cookieStore && typeof cookieStore.getAll === 'function') {
        // Traditional API
        allCookies = cookieStore.getAll();
      } else if (Symbol.iterator in cookieStore) {
        // Iterable API
        allCookies = Array.from(cookieStore as Iterable<RequestCookie>);
      } else {
        console.log(`[${debugId}] ⚠️ Cookie store exists but can't access cookies`);
      }
    } else {
      console.log(`[${debugId}] ⚠️ Cookie store unavailable`);
    }
    
    return { cookieStore, allCookies };
  } catch (error) {
    console.error(`[${debugId}] ❌ Error accessing cookies:`, error);
    return { cookieStore: null, allCookies: [] };
  }
}

/**
 * Auth debugging endpoint that can help diagnose issues with Supabase and NextAuth sessions
 * Masks sensitive information in production but provides enough data to diagnose issues
 */
export async function GET(req: NextRequest) {
  const debugId = generateDebugId();
  console.log(`[${debugId}] 🔍 Auth debug endpoint called`);

  // Check if endpoint is allowed in the current environment
  if (process.env.NODE_ENV === 'production' && !ALLOW_IN_PROD) {
    console.log(`[${debugId}] 🚫 Debug endpoint disabled in production`);
    return NextResponse.json(
      { error: 'This endpoint is disabled in production' },
      { status: 403 }
    );
  }

  try {
    // Collect environment info
    const isProd = process.env.NODE_ENV === 'production';
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY),
      hostInfo: req.headers.get('host'),
      userAgent: req.headers.get('user-agent')
    };
    
    console.log(`[${debugId}] 🔧 Environment info:`, envInfo);

    // Collect cookie info (without exposing values)
    const { cookieStore, allCookies } = await getCookies(debugId);
    
    const cookieDetails = allCookies.map(cookie => ({
      name: cookie.name,
      length: cookie.value.length,
      // Only show masked value in dev or if explicitly allowed
      value: isProd ? undefined : `${cookie.value.substring(0, 3)}...`
    }));
    
    const authCookies = {
      hasSupabaseAuthCookie: allCookies.some(c => c.name.startsWith('sb-')),
      hasNextAuthCookie: allCookies.some(c => c.name.startsWith('next-auth')),
      cookieCount: allCookies.length
    };
    
    console.log(`[${debugId}] 🍪 Cookie info:`, authCookies);

    // Check NextAuth session
    console.log(`[${debugId}] 🔐 Checking NextAuth session`);
    const nextAuthStartTime = Date.now();
    const nextAuthSession = await getServerSession();
    const nextAuthTime = Date.now() - nextAuthStartTime;
    
    console.log(`[${debugId}] ⏱️ NextAuth session check took ${nextAuthTime}ms`);
    console.log(`[${debugId}] 🔑 NextAuth session:`, nextAuthSession ? "Found" : "Not found");
    
    const nextAuthInfo = {
      hasSession: !!nextAuthSession,
      sessionTime: nextAuthTime,
      // Only include user ID in non-prod for privacy
      userId: isProd ? undefined : nextAuthSession?.user?.id
    };

    // Check Supabase client
    console.log(`[${debugId}] 🔨 Creating Supabase SSR client`);
    const supabaseClientStartTime = Date.now();
    let supabaseClientCreateTime: number;
    let supabaseClientError: string | null = null;
    
    try {
      // Create a test client
      const testClient = createSsrServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return allCookies;
            },
            setAll() {
              // We don't need to set cookies in this test
              console.log(`[${debugId}] ℹ️ setAll called (no-op in test)`);
            }
          }
        }
      );
      supabaseClientCreateTime = Date.now() - supabaseClientStartTime;
      console.log(`[${debugId}] ⏱️ Supabase client creation took ${supabaseClientCreateTime}ms`);
      
      // Test Supabase session (auth)
      console.log(`[${debugId}] 🔐 Checking Supabase session`);
      const supabaseAuthStartTime = Date.now();
      const { data: sessionData, error: sessionError } = await testClient.auth.getSession();
      const supabaseAuthTime = Date.now() - supabaseAuthStartTime;
      
      console.log(`[${debugId}] ⏱️ Supabase session check took ${supabaseAuthTime}ms`);
      
      if (sessionError) {
        console.error(`[${debugId}] ❌ Supabase session error:`, sessionError);
        supabaseClientError = sessionError.message;
      } else {
        console.log(`[${debugId}] 🔑 Supabase session:`, sessionData.session ? "Found" : "Not found");
      }

      // Test DB connection
      console.log(`[${debugId}] 🗄️ Testing Supabase DB connection`);
      const dbStartTime = Date.now();
      const { error: dbError } = await testClient.from('profiles').select('id', { count: 'exact', head: true });
      const dbTime = Date.now() - dbStartTime;
      
      console.log(`[${debugId}] ⏱️ Supabase DB test took ${dbTime}ms`);
      
      if (dbError) {
        console.error(`[${debugId}] ❌ Supabase DB error:`, dbError);
        if (!supabaseClientError) {
          supabaseClientError = dbError.message;
        }
      } else {
        console.log(`[${debugId}] ✅ Supabase DB connection successful`);
      }
      
      // Return the test results
      const supabaseInfo = {
        clientCreateTime: supabaseClientCreateTime,
        authCheckTime: supabaseAuthTime,
        dbCheckTime: dbTime,
        hasSession: !!sessionData.session,
        hasError: !!supabaseClientError,
        errorMessage: supabaseClientError,
        // Only include in non-prod for privacy
        userId: isProd && sessionData.session ? undefined : sessionData.user.id
      };
      
      const response = {
        debugId,
        timestamp: new Date().toISOString(),
        environment: envInfo,
        cookies: authCookies,
        nextAuth: nextAuthInfo,
        supabase: supabaseInfo,
        allCookies: isProd ? undefined : cookieDetails
      };
      
      console.log(`[${debugId}] ✅ Auth debug complete - successful`);
      return NextResponse.json(response);
      
    } catch (error) {
      supabaseClientCreateTime = Date.now() - supabaseClientStartTime;
      console.error(`[${debugId}] 🚨 Supabase client error:`, error);
      
      // Collect error details but mask any sensitive info in production
      const errorInfo = {
        message: error instanceof Error ? error.message : String(error),
        stack: isProd ? undefined : error instanceof Error ? error.stack : undefined
      };
      
      const response = {
        debugId,
        timestamp: new Date().toISOString(),
        environment: envInfo,
        cookies: authCookies,
        nextAuth: nextAuthInfo,
        supabase: {
          clientCreateTime: supabaseClientCreateTime,
          hasError: true,
          errorInfo
        },
        allCookies: isProd ? undefined : cookieDetails
      };
      
      console.log(`[${debugId}] ❌ Auth debug complete - with errors`);
      return NextResponse.json(response, { status: 500 });
    }
    
  } catch (error) {
    console.error(`[${debugId}] 🚨 Unhandled error in auth debug endpoint:`, error);
    
    const response = {
      debugId,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
    };
    
    return NextResponse.json(response, { status: 500 });
  }
} 