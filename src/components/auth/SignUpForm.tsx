'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState(true);

  // Get CSRF token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      setIsTokenLoading(true);
      
      try {
        // Fetch a fresh CSRF token - don't rely on sessionStorage
        console.log('Fetching CSRF token for signup form');
        const response = await fetch('/api/csrf', {
          method: 'GET',
          credentials: 'include', // Important: Ensures cookies are sent and received
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch CSRF token: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.csrfToken) {
          throw new Error('No CSRF token in response');
        }
        
        // Set token in component state only, don't store in sessionStorage
        setCsrfToken(data.csrfToken);
        console.log('CSRF token loaded successfully');
      } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
        setError('Security initialization failed. Please refresh the page and try again.');
      } finally {
        setIsTokenLoading(false);
      }
    };

    fetchToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!csrfToken) {
      setError('Security token missing. Please refresh the page and try again.');
      setIsLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    
    // Validate form data client-side
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const username = formData.get('username') as string;
    
    if (!email || !password || !username) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }
    
    // Prepare data object - don't include CSRF token in body
    const data = {
      email,
      password,
      username,
      name: formData.get('name') as string || undefined
    };

    try {
      console.log('Submitting signup with CSRF token in headers');
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include', // Important for cookies
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken, // Send only in header
        },
        body: JSON.stringify(data),
      });

      const responseData = await res.json().catch(() => ({ message: 'Server error' }));
      
      if (!res.ok) {
        // Check for different error types and provide helpful messages
        if (res.status === 403 && responseData.message?.includes('CSRF')) {
          setError('Session security error. Please refresh the page and try again.');
          
          // Fetch a new token for next attempt
          try {
            const tokenRes = await fetch('/api/csrf', { 
              method: 'GET',
              credentials: 'include',
              cache: 'no-store'
            });
            const tokenData = await tokenRes.json();
            if (tokenData.csrfToken) {
              setCsrfToken(tokenData.csrfToken);
            }
          } catch (tokenErr) {
            console.error('Failed to refresh CSRF token:', tokenErr);
          }
          
          setIsLoading(false);
          return;
        }
        
        if (res.status === 400 && responseData.errors) {
          // Format validation errors nicely
          const errorMsg = responseData.errors
            .map((e: {field: string, message: string}) => `${e.field}: ${e.message}`)
            .join('\n');
          setError(errorMsg);
          setIsLoading(false);
          return;
        }
        
        const errorMessage = responseData.message || 'Signup failed';
        console.error('Signup server error:', responseData);
        throw new Error(errorMessage);
      }

      // Success! Redirect to login page
      console.log('Signup successful, redirecting to login');
      router.push('/login?registered=true');
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded text-red-700">
          {error.includes('\n') ? (
            <ul className="list-disc pl-4">
              {error.split('\n').map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          ) : (
            error
          )}
        </div>
      )}
      
      {isTokenLoading ? (
        <div className="flex justify-center my-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-500"></div>
          <span className="ml-2">Loading security token...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-gray-700 font-medium mb-1">
              Email*
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Your email address"
              required
            />
          </div>
          
          <div>
            <label htmlFor="username" className="block text-gray-700 font-medium mb-1">
              Username*
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Choose a username"
              required
            />
          </div>
          
          <div>
            <label htmlFor="name" className="block text-gray-700 font-medium mb-1">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Your full name (optional)"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-gray-700 font-medium mb-1">
              Password*
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Create a strong password"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 10 characters with uppercase, lowercase, number, and special character
            </p>
          </div>
          
          <button
            type="submit"
            className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={isLoading || !csrfToken}
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
          
          <div className="text-center text-gray-600 text-sm mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-amber-600 hover:text-amber-700 font-medium">
              Log In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
} 