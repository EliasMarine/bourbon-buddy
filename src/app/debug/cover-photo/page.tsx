'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/use-supabase-session';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Add window type declaration for _csrfToken
declare global {
  interface Window {
    _csrfToken?: string;
  }
}

export default function CoverPhotoDebugPage() {
  const { data: session, status, refreshAvatar } = useSession();
  const router = useRouter();
  const [syncData, setSyncData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  
  // Function to get CSRF token
  const getCsrfToken = () => {
    return window._csrfToken || sessionStorage.getItem('csrfToken') || '';
  };

  useEffect(() => {
    if (status === 'authenticated') {
      checkSyncStatus();
    }
  }, [status]);

  const checkSyncStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/cover-photo-sync');
      if (!response.ok) {
        throw new Error(`Failed to fetch sync status: ${response.status}`);
      }
      const data = await response.json();
      setSyncData(data);
    } catch (error) {
      console.error('Error checking sync status:', error);
      toast.error('Failed to check sync status');
    } finally {
      setLoading(false);
    }
  };

  const fixCoverPhoto = async (url?: string) => {
    setFixLoading(true);
    try {
      const coverPhotoUrl = url || (syncData?.database?.coverPhotoValue || syncData?.auth?.coverPhotoValue);
      
      if (!coverPhotoUrl) {
        toast.error('No cover photo URL available to fix');
        return;
      }
      
      const response = await fetch('/api/debug/fix-cover-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken()
        },
        body: JSON.stringify({
          coverPhotoUrl
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fix cover photo: ${response.status}`);
      }
      
      const data = await response.json();
      toast.success('Cover photo fixed successfully');
      
      // Refresh session
      if (refreshAvatar) {
        await refreshAvatar();
      }
      
      // Refresh the page
      router.refresh();
      
      // Re-check sync status
      await checkSyncStatus();
      
    } catch (error) {
      console.error('Error fixing cover photo:', error);
      toast.error(`Failed to fix cover photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFixLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Cover Photo Debug</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Authentication Required</p>
          <p>Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Cover Photo Debug</h1>
      
      {/* PostgreSQL Case Sensitivity Alert */}
      <div className="mb-6 p-4 bg-blue-100 border-blue-200 border rounded-md">
        <h3 className="text-lg font-semibold mb-2 text-blue-800">PostgreSQL Case Sensitivity Note</h3>
        <p className="mb-2">PostgreSQL column names are case-sensitive. If your database column is named <code>coverPhoto</code> (camel case) but your code references <code>coverphoto</code> (lowercase), this can cause errors.</p>
        <p className="mb-2">This debug tool has been configured to handle case-sensitive column names by wrapping column names in double quotes (<code>"coverPhoto"</code>).</p>
        <p>If you're experiencing issues with cover photos not displaying, this could be due to case sensitivity differences between your code and database schema.</p>
      </div>
      
      <div className="mb-6 flex gap-4">
        <button
          className={`px-4 py-2 rounded-md ${loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
          onClick={checkSyncStatus}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Check Synchronization Status'}
        </button>
        
        <button
          className={`px-4 py-2 rounded-md ${fixLoading ? 'bg-gray-400' : 'bg-amber-500 hover:bg-amber-600'} text-white`}
          onClick={() => fixCoverPhoto()}
          disabled={fixLoading || !syncData}
        >
          {fixLoading ? 'Fixing...' : 'Fix Synchronization'}
        </button>
      </div>
      
      {/* Manual URL input */}
      <div className="mb-6 p-4 border rounded-md">
        <h2 className="text-lg font-semibold mb-2">Manual Fix</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="Enter cover photo URL manually"
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button
            className={`px-4 py-2 rounded-md ${fixLoading ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'} text-white`}
            onClick={() => fixCoverPhoto(manualUrl)}
            disabled={fixLoading || !manualUrl}
          >
            Apply
          </button>
        </div>
      </div>
      
      {syncData ? (
        <div className="space-y-6">
          {/* Sync Status */}
          <div className={`p-4 border rounded-md ${syncData.sync.match ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <h2 className="text-lg font-semibold mb-2">Synchronization Status</h2>
            <div className="flex items-center mb-2">
              <div className={`w-4 h-4 rounded-full mr-2 ${syncData.sync.match ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="font-medium">{syncData.sync.match ? 'Synchronized' : 'Not Synchronized'}</span>
            </div>
            {!syncData.sync.match && syncData.sync.discrepancy && (
              <div className="mt-2 text-sm">
                {syncData.sync.discrepancy.whatsMissing && (
                  <p>Missing in: <span className="font-semibold">{syncData.sync.discrepancy.whatsMissing}</span></p>
                )}
                {syncData.sync.discrepancy.lengthDifference !== 0 && (
                  <p>Length difference: <span className="font-semibold">{syncData.sync.discrepancy.lengthDifference}</span> characters</p>
                )}
              </div>
            )}
          </div>
          
          {/* Database Info */}
          <div className="p-4 border rounded-md bg-blue-50 border-blue-200">
            <h2 className="text-lg font-semibold mb-2">Database (public.User)</h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Status:</span> 
                <span className={`ml-2 ${syncData.database.coverPhotoPresent ? 'text-green-600' : 'text-red-600'}`}>
                  {syncData.database.coverPhotoPresent ? 'Present' : 'Missing'}
                </span>
              </p>
              {syncData.database.coverPhotoPresent && (
                <>
                  <p>
                    <span className="font-medium">Length:</span> 
                    <span className="ml-2">{syncData.database.coverPhotoLength} characters</span>
                  </p>
                  <div>
                    <p className="font-medium">Value:</p>
                    <div className="bg-gray-100 p-2 mt-1 rounded text-sm whitespace-normal break-all">
                      {syncData.database.coverPhotoValue}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">URL:</p>
                    <div className="bg-gray-100 p-2 mt-1 rounded text-sm whitespace-normal break-all">
                      {syncData.database.coverPhotoUrl}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Auth Info */}
          <div className="p-4 border rounded-md bg-purple-50 border-purple-200">
            <h2 className="text-lg font-semibold mb-2">Auth Metadata (auth.users)</h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Status:</span> 
                <span className={`ml-2 ${syncData.auth.coverPhotoPresent ? 'text-green-600' : 'text-red-600'}`}>
                  {syncData.auth.coverPhotoPresent ? 'Present' : 'Missing'}
                </span>
              </p>
              {syncData.auth.coverPhotoPresent && (
                <>
                  <p>
                    <span className="font-medium">Length:</span> 
                    <span className="ml-2">{syncData.auth.coverPhotoLength} characters</span>
                  </p>
                  <div>
                    <p className="font-medium">Value:</p>
                    <div className="bg-gray-100 p-2 mt-1 rounded text-sm whitespace-normal break-all">
                      {syncData.auth.coverPhotoValue}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">URL:</p>
                    <div className="bg-gray-100 p-2 mt-1 rounded text-sm whitespace-normal break-all">
                      {syncData.auth.coverPhotoUrl}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* SQL Data */}
          {syncData.sqlData && !syncData.sqlData.error && (
            <div className="p-4 border rounded-md bg-gray-50">
              <h2 className="text-lg font-semibold mb-2">SQL Query Results</h2>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(syncData.sqlData, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Raw Data */}
          <div className="p-4 border rounded-md">
            <h2 className="text-lg font-semibold mb-2">Raw Response</h2>
            <button 
              className="text-sm bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded mb-2"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(syncData, null, 2));
                toast.success('Copied to clipboard');
              }}
            >
              Copy to Clipboard
            </button>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(syncData, null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="bg-gray-100 p-4 rounded-md">
            <p>Click "Check Synchronization Status" to see details about the cover photo.</p>
          </div>
        )
      )}
    </div>
  );
} 