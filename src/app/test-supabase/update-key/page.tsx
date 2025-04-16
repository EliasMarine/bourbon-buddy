'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UpdateKeyPage() {
  const router = useRouter();
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [currentDetails, setCurrentDetails] = useState<{
    url: string | null;
    keyPrefix: string | null;
    keyExpiry: string | null;
    projectRef: string | null;
  }>({
    url: null,
    keyPrefix: null,
    keyExpiry: null,
    projectRef: null
  });
  
  useEffect(() => {
    // Check current values from env
    const currentUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const currentKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (currentUrl) {
      setCurrentDetails(prev => ({ ...prev, url: currentUrl }));
    }
    
    if (currentKey) {
      try {
        const parts = currentKey.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          
          setCurrentDetails(prev => ({
            ...prev,
            keyPrefix: currentKey.substring(0, 10) + '...',
            keyExpiry: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'Unknown',
            projectRef: payload.ref || null
          }));
        }
      } catch (e) {
        console.error('Error parsing current JWT:', e);
      }
    }
  }, []);
  
  const testConnection = async () => {
    if (!supabaseUrl || !supabaseKey) {
      alert('Please enter both URL and API key');
      return;
    }
    
    setLoading(true);
    setTestResult(null);
    
    try {
      // Analyze the key
      let keyInfo: { 
        valid: boolean; 
        parts: number; 
        payload: { 
          role: any; 
          projectRef: any; 
          expiry: string; 
          issuer: any; 
        } | null;
      } = { 
        valid: false, 
        parts: 0, 
        payload: null 
      };
      
      try {
        const parts = supabaseKey.split('.');
        keyInfo.parts = parts.length;
        
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          keyInfo.valid = true;
          keyInfo.payload = {
            role: payload.role,
            projectRef: payload.ref,
            expiry: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'Unknown',
            issuer: payload.iss
          };
        }
      } catch (e) {
        keyInfo.valid = false;
      }
      
      // Test connection to Supabase
      const startTime = Date.now();
      const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        }
      });
      const endTime = Date.now();
      
      // Parse response
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        responseData = { parseError: 'Failed to parse response' };
      }
      
      // Try a sample auth request
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'invalid_password_for_testing'
        })
      });
      
      let authData;
      try {
        authData = await authResponse.json();
      } catch (jsonError) {
        authData = { parseError: 'Failed to parse auth response' };
      }
      
      setTestResult({
        timestamp: new Date().toISOString(),
        key: keyInfo,
        connectivity: {
          status: response.status,
          statusText: response.statusText,
          responseTime: endTime - startTime,
          data: responseData
        },
        auth: {
          status: authResponse.status,
          statusText: authResponse.statusText,
          data: authData
        },
        success: response.ok && 
                (authResponse.status === 400 || authResponse.status === 401) && 
                authData.error === 'invalid_grant'
      });
    } catch (e: any) {
      setTestResult({
        timestamp: new Date().toISOString(),
        error: e.message,
        success: false
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Update Supabase Configuration</h1>
      
      <div className="mb-8 p-4 bg-gray-800 border rounded-md">
        <p className="mb-4">
          This page helps you verify and update your Supabase API key and URL. 
          If you're experiencing "Invalid API key" errors, you may need to:
        </p>
        <ol className="list-decimal pl-5 space-y-1 mb-4">
          <li>Log in to your Supabase dashboard</li>
          <li>Go to Project Settings → API</li>
          <li>Copy the Project URL and anon key</li>
          <li>Test them below, then update your .env.local file</li>
        </ol>
        
        <div className="mt-6 p-4 bg-gray-700 rounded">
          <h3 className="font-medium mb-3">Current Configuration</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div>Supabase URL:</div>
            <div className="text-amber-400">{currentDetails.url || 'Not set'}</div>
            
            <div>API Key (prefix):</div>
            <div className="text-amber-400">{currentDetails.keyPrefix || 'Not set'}</div>
            
            <div>Key Expiry:</div>
            <div className="text-amber-400">{currentDetails.keyExpiry || 'Unknown'}</div>
            
            <div>Project Reference:</div>
            <div className="text-amber-400">{currentDetails.projectRef || 'Unknown'}</div>
          </div>
        </div>
      </div>
      
      <div className="space-y-6 mb-8">
        <div>
          <label htmlFor="supabaseUrl" className="block text-sm font-medium mb-1">
            Supabase URL
          </label>
          <input
            id="supabaseUrl"
            type="text"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            placeholder="https://your-project.supabase.co"
            className="w-full p-2 border rounded text-black"
          />
          <p className="text-xs text-gray-400 mt-1">
            Copy from Project Settings → API → Project URL
          </p>
        </div>
        
        <div>
          <label htmlFor="supabaseKey" className="block text-sm font-medium mb-1">
            Supabase anon key
          </label>
          <input
            id="supabaseKey"
            type="text"
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full p-2 border rounded text-black"
          />
          <p className="text-xs text-gray-400 mt-1">
            Copy from Project Settings → API → Project API keys → anon public
          </p>
        </div>
        
        <div>
          <button
            onClick={testConnection}
            disabled={loading || !supabaseUrl || !supabaseKey}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300"
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-3">Testing connection...</span>
        </div>
      )}
      
      {testResult && (
        <div className="mb-8">
          <div className={`p-5 rounded-t border-t border-l border-r ${testResult.success ? 'bg-green-900 border-green-700' : 'bg-red-900 border-red-700'}`}>
            <h2 className="text-xl font-bold flex items-center">
              {testResult.success ? (
                <>
                  <span className="mr-2">✅</span> Connection Successful
                </>
              ) : (
                <>
                  <span className="mr-2">❌</span> Connection Failed
                </>
              )}
            </h2>
            <p className="mt-2">
              {testResult.success 
                ? 'Your Supabase configuration is working correctly.' 
                : 'There was a problem connecting to Supabase with these credentials.'}
            </p>
          </div>
          
          <div className="border rounded-b border-gray-700 p-4 bg-gray-800">
            <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
          
          {testResult.success && (
            <div className="mt-6 p-4 bg-gray-800 border border-green-700 rounded">
              <h3 className="font-bold mb-2">Next Steps</h3>
              <p className="mb-4">
                This configuration works! Update your <code className="bg-gray-700 px-1 rounded">.env.local</code> file with these values:
              </p>
              <div className="bg-gray-900 p-3 rounded font-mono text-sm">
                <div>NEXT_PUBLIC_SUPABASE_URL={supabaseUrl}</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY={supabaseKey}</div>
              </div>
              <p className="mt-4">
                After updating your .env.local file, restart your Next.js server.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 