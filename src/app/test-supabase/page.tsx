'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function TestSupabase() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [supabaseDetails, setSupabaseDetails] = useState({
    url: '',
    key: '',
  });

  useEffect(() => {
    // Get environment variables (Note: only NEXT_PUBLIC_ vars are accessible)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    setSupabaseDetails({
      url: url ? `${url.substring(0, 15)}...` : 'Not available',
      key: key ? `${key.substring(0, 10)}...` : 'Not available',
    });
  }, []);

  const addResult = (test: string, passed: boolean, message?: string) => {
    setResults(prev => [...prev, {
      test,
      passed,
      message,
      timestamp: new Date().toISOString()
    }]);
  };

  const runTests = async () => {
    setError(null);
    setResults([]);
    setLoading(true);

    try {
      // Test 1: Check URL and key are available
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        addResult('Environment Variables Check', false, 
          `Missing variables: ${!url ? 'URL' : ''} ${!key ? 'ANON_KEY' : ''}`);
        throw new Error('Missing Supabase environment variables');
      }
      
      addResult('Environment Variables Check', true, 'URL and Anon Key found');

      // Test 2: Create client
      try {
        const supabase = createClient(url, key);
        addResult('Client Creation', true, 'Supabase client created successfully');
        
        // Test 3: Test auth
        try {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            addResult('Auth API Test', false, `Error: ${error.message}`);
          } else {
            addResult('Auth API Test', true, 
              `Session found: ${data.session ? 'Yes' : 'No (expected for anonymous)'}`);
          }
        } catch (authError: any) {
          addResult('Auth API Test', false, `Exception: ${authError.message}`);
        }
        
        // Test 4: Test direct endpoint access
        try {
          const response = await fetch(`${url}/auth/v1/settings`);
          const status = response.status;
          
          if (status === 401) {
            // 401 is actually expected since we're not including auth headers
            addResult('URL Endpoint Test', true, 
              'URL endpoint accessible (got expected 401 response)');
          } else if (status === 404) {
            addResult('URL Endpoint Test', false, 'URL incorrect (404 Not Found)');
          } else {
            addResult('URL Endpoint Test', true, 
              `URL endpoint accessible (status ${status})`);
          }
        } catch (fetchError: any) {
          addResult('URL Endpoint Test', false, 
            `Network error: ${fetchError.message}`);
        }
        
        // Test 5: Direct API test using the token endpoint
        try {
          const testEmail = 'test@example.com'; // Not a real test - just checking endpoint
          const testPassword = 'fakepassword';   // Not a real test - just checking endpoint
          
          const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': key
            },
            body: JSON.stringify({
              email: testEmail,
              password: testPassword
            })
          });
          
          const authStatus = authResponse.status;
          const authData = await authResponse.json();
          
          // We expect a 400 "invalid_grant" since we're using fake credentials
          // But this test still confirms the API key is valid
          if (authStatus === 400 && authData.error === 'invalid_grant') {
            addResult('Direct Auth API Test', true, 
              'Auth endpoint working correctly (got expected invalid_grant error)');
          } else if (authStatus === 401) {
            addResult('Direct Auth API Test', false, 
              'Auth endpoint rejected our API key (401 Unauthorized)');
          } else {
            addResult('Direct Auth API Test', true, 
              `Auth endpoint reachable (status ${authStatus})`);
          }
        } catch (directAuthError: any) {
          addResult('Direct Auth API Test', false, 
            `Network error: ${directAuthError.message}`);
        }
        
      } catch (clientError: any) {
        addResult('Client Creation', false, `Error: ${clientError.message}`);
      }
      
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Supabase Connection Tester</h1>
      
      <div className="mb-8 p-4 bg-gray-800 border border-gray-700 rounded">
        <h2 className="text-xl font-semibold mb-2">Supabase Configuration</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>URL:</strong> {supabaseDetails.url}
          </div>
          <div>
            <strong>Anon Key:</strong> {supabaseDetails.key}
          </div>
        </div>
      </div>
      
      <button
        onClick={runTests}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:bg-blue-400"
      >
        {loading ? 'Running Tests...' : 'Run Connection Tests'}
      </button>
      
      {error && (
        <div className="mt-6 p-4 bg-red-900 border border-red-700 text-white rounded">
          <h3 className="font-bold">Error</h3>
          <p>{error}</p>
        </div>
      )}
      
      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Test Results</h2>
          <div className="border border-gray-700 rounded overflow-hidden">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`p-4 border-b border-gray-700 ${
                  result.passed ? 'bg-green-900 bg-opacity-30' : 'bg-red-900 bg-opacity-30'
                } ${index === results.length - 1 ? 'border-b-0' : ''}`}
              >
                <div className="flex items-start">
                  <div className={`mr-3 mt-0.5 ${
                    result.passed ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {result.passed ? '✅' : '❌'}
                  </div>
                  <div>
                    <h3 className="font-semibold">{result.test}</h3>
                    {result.message && <p className="text-sm mt-1">{result.message}</p>}
                    <p className="text-xs text-gray-400 mt-1">{result.timestamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {results.length > 0 && !results.every(r => r.passed) && (
        <div className="mt-6 p-4 bg-amber-900 bg-opacity-50 border border-amber-700 rounded">
          <h3 className="font-bold text-lg mb-2">Troubleshooting Tips</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Check if your Supabase URL and Anon Key are correct in .env.local</li>
            <li>Ensure your Supabase project is active (not paused)</li>
            <li>Verify that your Anon Key has not been revoked or changed</li>
            <li>Check if there are any IP restrictions on your Supabase project</li>
            <li>Try generating a new Anon Key in the Supabase dashboard</li>
            <li>Ensure your CORS settings in Supabase include your domain</li>
            <li>Verify that you're using a browser without aggressive privacy settings</li>
          </ul>
        </div>
      )}
    </div>
  );
} 