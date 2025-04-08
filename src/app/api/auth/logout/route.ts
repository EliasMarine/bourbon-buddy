import { NextResponse } from 'next/server';
import { type CookieOptions } from '@supabase/ssr';

export async function POST() {
  try {
    // Create response and clear all cookies
    const response = NextResponse.json({ success: true });
    
    // Define common auth cookie names that might need to be cleared
    const cookiesToClear = [
      // NextAuth cookies
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      '__Host-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url',
      // Supabase cookies
      'sb-access-token',
      'sb-refresh-token',
      // CSRF tokens 
      'csrf_secret',
      '__Host-csrf_secret'
    ];
    
    // Clear all cookies with proper settings
    cookiesToClear.forEach(name => {
      // Add explicit cookie expiration for each cookie
      response.cookies.set({
        name,
        value: '',
        expires: new Date(0),
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });
    });
    
    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { error: 'Failed to sign out properly' },
      { status: 500 }
    );
  }
} 