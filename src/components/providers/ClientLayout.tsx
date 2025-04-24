'use client';

import React from 'react';
import * as Sentry from '@sentry/nextjs';
import AuthProvider from './AuthProvider';
import { CsrfToken } from '@/components/CsrfToken';

interface ClientLayoutProps {
  children: React.ReactNode;
}

// Simple error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
      tags: { source: 'error_boundary' }
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
    <ErrorBoundary
      children={
        <AuthProvider children={
          <CsrfToken children={children} />
        } />
      }
      fallback={<ErrorFallback error={new Error("Client component failed to render")} />}
    />
  );
} 