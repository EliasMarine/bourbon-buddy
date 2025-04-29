'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';

export default function AuthTestPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cookieInfo, setCookieInfo] = useState<string[]>([]);
  
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  
  // Check current auth state on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Auth error:', error);
          setMessage('Not authenticated');
        } else if (data.user) {
          setUser(data.user);
          setMessage('Authenticated');
        } else {
          setMessage('No user found');
        }
        
        // Check cookies
        const cookies = document.cookie.split(';').map(c => c.trim());
        setCookieInfo(cookies.filter(c => c.includes('sb-')));
      } catch (err) {
        console.error('Error checking auth:', err);
        setMessage('Error checking auth state');
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
  }, []);
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Signing up...');
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/test`,
        }
      });
      
      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Check your email for the confirmation link');
      }
    } catch (err) {
      console.error('Sign up error:', err);
      setMessage('Sign up failed');
    }
  };
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Signing in...');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        setMessage(`Error: ${error.message}`);
      } else if (data.user) {
        setUser(data.user);
        setMessage('Signed in successfully');
        
        // Check cookies after sign in
        setTimeout(() => {
          const cookies = document.cookie.split(';').map(c => c.trim());
          setCookieInfo(cookies.filter(c => c.includes('sb-')));
        }, 500);
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setMessage('Sign in failed');
    }
  };
  
  const handleSignOut = async () => {
    setMessage('Signing out...');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setUser(null);
        setMessage('Signed out successfully');
        
        // Check cookies after sign out
        setTimeout(() => {
          const cookies = document.cookie.split(';').map(c => c.trim());
          setCookieInfo(cookies.filter(c => c.includes('sb-')));
        }, 500);
      }
    } catch (err) {
      console.error('Sign out error:', err);
      setMessage('Sign out failed');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="p-8 rounded-lg shadow-lg bg-gray-800 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Loading...</h1>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="p-8 rounded-lg shadow-lg bg-gray-800 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Supabase Auth Test</h1>
        
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Status</h2>
          <p className={message.includes('Error') ? 'text-red-400' : 'text-green-400'}>
            {message}
          </p>
          
          {user && (
            <div className="mt-4">
              <h3 className="font-medium">User Info:</h3>
              <pre className="bg-gray-900 p-3 rounded-md mt-2 overflow-auto text-xs">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="mt-4">
            <h3 className="font-medium">Cookies:</h3>
            {cookieInfo.length > 0 ? (
              <ul className="bg-gray-900 p-3 rounded-md mt-2 overflow-auto text-xs">
                {cookieInfo.map((cookie, i) => (
                  <li key={i}>{cookie}</li>
                ))}
              </ul>
            ) : (
              <p className="text-yellow-400 mt-2">No Supabase cookies found</p>
            )}
          </div>
        </div>
        
        {!user ? (
          <>
            <form onSubmit={handleSignIn} className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Sign In</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 py-2 px-4 rounded hover:bg-blue-700 transition"
              >
                Sign In
              </button>
            </form>
            
            <form onSubmit={handleSignUp}>
              <h2 className="text-xl font-semibold mb-4">Sign Up</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-green-600 py-2 px-4 rounded hover:bg-green-700 transition"
              >
                Sign Up
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center">
            <button
              onClick={handleSignOut}
              className="bg-red-600 py-2 px-6 rounded hover:bg-red-700 transition"
            >
              Sign Out
            </button>
            
            <div className="mt-6 text-center">
              <Link 
                href="/dashboard" 
                className="text-blue-400 hover:underline"
                prefetch={false}
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
        
        <div className="mt-6 pt-6 border-t border-gray-700 text-center text-sm text-gray-400">
          <Link href="/" className="hover:text-white">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 