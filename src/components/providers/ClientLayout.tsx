'use client';

import React from 'react';
import AuthProvider from './AuthProvider';
import { CsrfToken } from '@/components/CsrfToken';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <AuthProvider>
      <CsrfToken>
        {children}
      </CsrfToken>
    </AuthProvider>
  );
} 