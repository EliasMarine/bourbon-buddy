"use client";

import * as Sentry from "@sentry/nextjs";
import Error from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report the error to Sentry
    const eventId = Sentry.captureException(error);
    console.log('Error reported to Sentry with ID:', eventId);
  }, [error]);

  // Get error message safely by treating it as any type
  // This is necessary because the actual runtime error object may differ from types
  const errorMessage = (error as any)?.message || String(error);

  return (
    <html>
      <body>
        <div className="global-error-container">
          <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 border border-red-100">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Application Error</h2>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-2">
                  A critical error occurred in the application.
                </p>
                <p className="text-sm text-gray-500">
                  This error has been automatically reported to our team.
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-6 overflow-hidden">
                <p className="font-mono text-sm text-red-600 whitespace-pre-wrap break-words">
                  {errorMessage}
                </p>
              </div>
              
              <button
                onClick={() => {
                  // Clear any cached data that might be causing the error
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('sentry-error-test');
                    sessionStorage.removeItem('sentry-error-test');
                  }
                  
                  // Try to reset the application
                  reset();
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Try again
              </button>
              
              <div className="mt-4 text-center">
                <a href="/" className="text-blue-600 hover:underline text-sm">
                  Return to homepage
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
} 