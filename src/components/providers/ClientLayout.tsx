'use client';

import React, { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import AuthProvider from './AuthProvider';
import { CsrfToken } from '@/components/CsrfToken';

interface ClientLayoutProps {
  children: React.ReactNode;
}

// Error boundary component
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      },
      tags: {
        source: 'error_boundary'
      }
    });
    
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Simple error boundary fallback
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 m-2 rounded shadow-sm">
      <p className="text-red-700 font-medium">Something went wrong in the client component</p>
      <p className="text-red-600 text-sm mt-1">{error.message || 'Unknown error'}</p>
    </div>
  );
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ErrorBoundary fallback={<ErrorFallback error={new Error("Client component failed to render")} />}>
      <AuthProvider>
        <CsrfToken>
          {children}
        </CsrfToken>
      </AuthProvider>
    </ErrorBoundary>
  );
} 