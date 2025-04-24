import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
// Removed authOptions import - not needed with Supabase Auth;
import { getCsrfCookieName, getNextAuthCsrfCookieName } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    // Get the cookie names we expect
    const productionCsrfCookieName = '__Host-csrf_secret';
    const productionNextAuthCsrfToken = '__Host-next-auth.csrf-token';
    const productionNextAuthSessionToken = '__Secure-next-auth.session-token';
    const productionNextAuthCallbackUrl = '__Secure-next-auth.callback-url';
    
    const developmentCsrfCookieName = 'csrf_secret';
    const developmentNextAuthCsrfToken = 'next-auth.csrf-token';
    const developmentNextAuthSessionToken = 'next-auth.session-token';
    const developmentNextAuthCallbackUrl = 'next-auth.callback-url';
    
    // Get actual cookie names from our utility functions
    const actualCsrfCookieName = getCsrfCookieName();
    const actualNextAuthCsrfCookieName = getNextAuthCsrfCookieName();
    
    // Check all cookies in the request
    const cookieHeader = request.headers.get('cookie');
    const cookieList = request.cookies.getAll();
    const cookieNames = cookieList.map(cookie => cookie.name);
    
    // Get request information
    const protocol = request.nextUrl.protocol;
    const host = request.headers.get('host') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const secureContext = request.headers.get('x-forwarded-proto') === 'https';
    
    // Check for specific cookies with prefixes
    const hasHostCsrfCookie = cookieNames.includes(productionCsrfCookieName);
    const hasHostNextAuthCsrfToken = cookieNames.includes(productionNextAuthCsrfToken);
    const hasSecureNextAuthSessionToken = cookieNames.includes(productionNextAuthSessionToken);
    const hasSecureNextAuthCallbackUrl = cookieNames.includes(productionNextAuthCallbackUrl);
    
    // Check for development cookies
    const hasDevelopmentCsrfCookie = cookieNames.includes(developmentCsrfCookieName);
    const hasDevelopmentNextAuthCsrfToken = cookieNames.includes(developmentNextAuthCsrfToken);
    const hasDevelopmentNextAuthSessionToken = cookieNames.includes(developmentNextAuthSessionToken);
    const hasDevelopmentNextAuthCallbackUrl = cookieNames.includes(developmentNextAuthCallbackUrl);
    
    // Return debug information
    return NextResponse.json({
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isProduction: process.env.NODE_ENV === 'production',
      },
      request: {
        protocol,
        host,
        isSecure: protocol === 'https:' || secureContext,
        userAgent,
      },
      cookies: {
        allCookieNames: cookieNames,
        expectedCookies: {
          production: {
            csrfCookie: productionCsrfCookieName,
            nextAuthCsrfToken: productionNextAuthCsrfToken,
            nextAuthSessionToken: productionNextAuthSessionToken,
            nextAuthCallbackUrl: productionNextAuthCallbackUrl,
          },
          development: {
            csrfCookie: developmentCsrfCookieName,
            nextAuthCsrfToken: developmentNextAuthCsrfToken,
            nextAuthSessionToken: developmentNextAuthSessionToken,
            nextAuthCallbackUrl: developmentNextAuthCallbackUrl,
          },
          actual: {
            csrfCookie: actualCsrfCookieName,
            nextAuthCsrfToken: actualNextAuthCsrfCookieName,
          }
        },
        productionCookiesPresent: {
          hasHostCsrfCookie,
          hasHostNextAuthCsrfToken,
          hasSecureNextAuthSessionToken,
          hasSecureNextAuthCallbackUrl,
        },
        developmentCookiesPresent: {
          hasDevelopmentCsrfCookie,
          hasDevelopmentNextAuthCsrfToken,
          hasDevelopmentNextAuthSessionToken,
          hasDevelopmentNextAuthCallbackUrl,
        },
        cookieCount: cookieNames.length,
      },
      auth: {
        isAuthenticated: false,
        user: null,
      },
    });
  } catch (error) {
    console.error('Error in cookie debug endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to get cookie information', 
      message: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 