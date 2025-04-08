'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Get CSRF token on component mount
  useEffect(() => {
    // Try to get token from sessionStorage first (set by CsrfToken provider)
    try {
      const storedToken = sessionStorage.getItem('csrfToken');
      if (storedToken) {
        console.log('Using cached CSRF token for signup form');
        setCsrfToken(storedToken);
        return;
      }
    } catch (err) {
      console.warn('Unable to access sessionStorage', err);
    }

    // If no token in sessionStorage, fetch one
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/csrf', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store'
        });
        const data = await response.json();
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
          // Store for future use
          try {
            sessionStorage.setItem('csrfToken', data.csrfToken);
          } catch (err) {
            console.warn('Unable to store CSRF token', err);
          }
        }
      } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
        setError('Failed to secure the form. Please try again or refresh the page.');
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
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
      username: formData.get('username'),
      name: formData.get('name'),
      csrfToken: csrfToken // Include CSRF token in request body as well
    };

    try {
      console.log('Submitting signup with CSRF token');
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include', // Important for cookies
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken, // Send in header
          'csrf-token': csrfToken, // Alternative format
        },
        body: JSON.stringify(data),
      });

      const responseData = await res.json().catch(() => ({ message: 'Server error' }));
      
      if (!res.ok) {
        const errorMessage = responseData.message || 'Signup failed';
        console.error('Signup server error:', responseData);
        throw new Error(errorMessage);
      }

      router.push('/login');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Sign Up</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {/* Add hidden CSRF token field */}
        <input type="hidden" name="csrfToken" value={csrfToken || ''} />
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            required
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 disabled:opacity-50"
        >
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
} 