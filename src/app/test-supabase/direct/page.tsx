'use client';

import { useState, useEffect } from 'react';

export default function DirectAuthTest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [envVars, setEnvVars] = useState<{
    supabaseUrl: string | null;
    supabaseKeyPrefix: string | null;
  }>({ supabaseUrl: null, supabaseKeyPrefix: null });
  
  // Check environment variables on load
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    setEnvVars({
      supabaseUrl: supabaseUrl || null,
      supabaseKeyPrefix: supabaseKey ? supabaseKey.substring(0, 10) + '...' : null
    });
  }, []);
  
  const testDirectAuth = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
      }
      
      console.log('Making direct API call to Supabase Auth');
      
      const authUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
      console.log('Auth URL:', authUrl);
      
      const headers = {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'X-Client-Info': 'test-auth-direct'
      };
      
      console.log('Request headers:', Object.keys(headers).join(', '));
      
      // Method 1: Direct API call
      const authResponse = await fetch(authUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          password
        })
      });
      
      let responseData;
      let responseText;
      
      try {
        responseData = await authResponse.json();
      } catch (jsonError) {
        // If JSON parsing fails, get the text content
        responseText = await authResponse.text();
        responseData = { 
          parseError: 'Failed to parse JSON response',
          rawText: responseText
        };
      }
      
      setResponse({
        status: authResponse.status,
        statusText: authResponse.statusText,
        headers: Object.fromEntries(
          Array.from(authResponse.headers.entries())
        ),
        url: authResponse.url,
        redirected: authResponse.redirected,
        data: responseData
      });
      
    } catch (e: any) {
      console.error('Direct auth error:', e);
      setError(e.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const testProxyAuth = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      // Method 2: Using our custom proxy
      const proxyUrl = '/api/auth/login-proxy';
      console.log('Proxy URL:', proxyUrl);
      
      const headers = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'test-token' // Add CSRF token for the proxy
      };
      
      console.log('Request headers:', Object.keys(headers).join(', '));
      
      const proxyResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          password
        })
      });
      
      let responseData;
      let responseText;
      
      try {
        responseData = await proxyResponse.json();
      } catch (jsonError) {
        // If JSON parsing fails, get the text content
        responseText = await proxyResponse.text();
        responseData = { 
          parseError: 'Failed to parse JSON response',
          rawText: responseText
        };
      }
      
      setResponse({
        status: proxyResponse.status,
        statusText: proxyResponse.statusText,
        headers: Object.fromEntries(
          Array.from(proxyResponse.headers.entries())
        ),
        url: proxyResponse.url,
        redirected: proxyResponse.redirected,
        data: responseData
      });
      
    } catch (e: any) {
      console.error('Proxy auth error:', e);
      setError(e.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const verifyJwt = () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseKey) {
        throw new Error('Missing Supabase anon key');
      }
      
      // Basic JWT structure check
      const parts = supabaseKey.split('.');
      
      if (parts.length !== 3) {
        throw new Error('JWT should have 3 parts: header, payload, signature');
      }
      
      // Decode JWT payload (middle part)
      try {
        const payload = JSON.parse(atob(parts[1]));
        
        setResponse({
          jwtValid: true,
          decoded: {
            // Filter out sensitive information
            role: payload.role,
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'Not set',
            iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'Not set',
            expiresIn: payload.exp ? Math.floor((payload.exp * 1000 - Date.now()) / (1000 * 60 * 60 * 24)) + ' days' : 'Unknown',
            issuer: payload.iss ? payload.iss.replace(/https:\/\//, '') : 'Not set'
          }
        });
      } catch (e) {
        throw new Error('Failed to decode JWT payload: ' + (e as Error).message);
      }
    } catch (e: any) {
      console.error('JWT verification error:', e);
      setError(e.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Direct Supabase Auth Test</h1>
      
      <div className="mb-8 p-4 bg-gray-800 border rounded-md">
        <p className="mb-2">
          This page tests Supabase authentication directly, bypassing any middleware or client libraries.
          Use it to verify that your Supabase API key and URL are working correctly.
        </p>
        <div className="text-sm mt-4 p-3 bg-gray-700 rounded">
          <h3 className="font-medium mb-2">Environment Variables</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>NEXT_PUBLIC_SUPABASE_URL:</div>
            <div className="text-amber-400">{envVars.supabaseUrl ? `${envVars.supabaseUrl.substring(0, 20)}...` : 'Not set'}</div>
            
            <div>NEXT_PUBLIC_SUPABASE_ANON_KEY:</div>
            <div className="text-amber-400">{envVars.supabaseKeyPrefix || 'Not set'}</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded text-black"
              placeholder="test@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded text-black"
            />
          </div>
        </div>
        
        <div className="flex flex-col space-y-3 justify-end">
          <button
            onClick={testDirectAuth}
            disabled={loading || !email || !password}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300"
          >
            Test Direct Auth API
          </button>
          
          <button
            onClick={testProxyAuth}
            disabled={loading || !email || !password}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-green-300"
          >
            Test Auth Via Proxy
          </button>
          
          <button
            onClick={verifyJwt}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded disabled:bg-purple-300"
          >
            Verify JWT Format
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-3">Processing...</span>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-900 border border-red-700 text-white rounded mb-4">
          <h3 className="font-bold mb-2">Error</h3>
          <pre className="text-sm whitespace-pre-wrap">{error}</pre>
        </div>
      )}
      
      {response && (
        <div className="border rounded overflow-hidden bg-gray-800">
          <div className="p-3 bg-gray-700 border-b font-medium">
            {response.status ? `Response (Status: ${response.status} ${response.statusText})` : 'Result'}
          </div>
          <div className="p-4">
            <pre className="text-sm whitespace-pre-wrap bg-black text-green-400 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <div className="mt-8 pt-6 border-t border-gray-700">
        <h2 className="text-xl font-bold mb-4">Troubleshooting</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-300">
          <li><strong>401 Unauthorized</strong>: Check if your credentials are correct. Also verify JWT token hasn't expired.</li>
          <li><strong>404 Not Found</strong>: Ensure your Supabase URL is correct.</li>
          <li><strong>CORS errors</strong>: Direct browser requests may be blocked by CORS. Use the Proxy method instead.</li>
          <li><strong>Network errors</strong>: Check your internet connection and Supabase service status.</li>
        </ul>
      </div>
    </div>
  );
}