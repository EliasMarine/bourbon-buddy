'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="bg-gray-800 text-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold">
            Whiskey Social
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link href="/streams" className="hover:text-gray-300">
              Live Streams
            </Link>
            {status === 'authenticated' ? (
              <>
                <Link href="/dashboard" className="hover:text-gray-300">
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut()}
                  className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="bg-amber-600 px-4 py-2 rounded hover:bg-amber-700"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 