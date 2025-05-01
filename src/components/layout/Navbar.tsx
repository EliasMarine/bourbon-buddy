'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { 
  Menu, X, User, LogOut, Home, BookOpen, 
  Tv, ChevronDown, Camera, Key, Settings,
  Shield, UserCircle, Edit, RefreshCw, Palette,
  Globe, DollarSign, HelpCircle, PlayCircle
} from 'lucide-react';
import GlencairnGlass from '../ui/icons/GlencairnGlass';
import { getProfileImageUrl, getInitialLetter, DEFAULT_AVATAR_BG } from '@/lib/utils';
import SafeImage from '@/components/ui/SafeImage';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { toast } from 'react-hot-toast';

export default function Navbar() {
  const { data: session, status, signOut } = useSupabaseSession();
  const { supabase } = useSupabase();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showFloatingNav, setShowFloatingNav] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const lastScrollY = useRef(0);
  const [isLoading, setIsLoading] = useState(false);

  // Get user name with better fallback handling
  const displayName = React.useMemo(() => {
    // Check if session user exists
    if (!session?.user) return 'User';

    // Try multiple sources for the name in order of preference
    
    // 1. Check the direct name property from the database User table
    if (session.user.name && session.user.name !== 'User') {
      return session.user.name;
    }
    
    // 2. Check user_metadata with different possible fields
    // @ts-ignore - user_metadata might exist in Supabase Auth sessions
    const metadata = session.user.user_metadata;
    if (metadata) {
      // Check specific metadata fields in order of preference
      if (metadata.name && metadata.name !== 'User') return metadata.name;
      if (metadata.full_name) return metadata.full_name;
      if (metadata.preferred_username) return metadata.preferred_username;
      if (metadata.username) return metadata.username;
      if (metadata.given_name) return metadata.given_name;
    }
    
    // 3. Fallback to email username part if available
    if (session.user.email) {
      return session.user.email.split('@')[0];
    }
    
    // Last resort
    return 'User';
  }, [session?.user]);

  // Handle scroll for navbar background and floating navigation
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Main navbar background effect - navbar starts transparent and only gets background when scrolled
      setIsScrolled(currentScrollY > 20);
      
      // Show floating nav when scrolling down past 300px
      if (currentScrollY > 300) {
        setShowFloatingNav(true);
      } else {
        setShowFloatingNav(false);
      }
      
      // Hide floating nav when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY.current && currentScrollY > 400) {
        setShowFloatingNav(false);
      } else if (currentScrollY < lastScrollY.current && currentScrollY > 300) {
        setShowFloatingNav(true);
      }
      
      lastScrollY.current = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isProfileOpen &&
        profileMenuRef.current &&
        profileButtonRef.current &&
        !profileMenuRef.current.contains(event.target as Node) &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  const navLinks = [
    { name: 'Home', href: '/', icon: <Home size={18} /> },
    { name: 'My Collection', href: '/collection', icon: <User size={18} /> },
    { name: 'Explore', href: '/explore', icon: <Globe size={18} /> },
    { name: 'Live Tastings', href: '/streams', icon: <Tv size={18} /> },
    { name: 'Past Tastings', href: '/past-tastings', icon: <PlayCircle size={18} /> },
    { name: 'Pricing', href: '/pricing', icon: <DollarSign size={18} /> },
    { name: 'About', href: '/about', icon: <BookOpen size={18} /> },
  ];

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  };

  // Handle sign out with improved cleanup
  const handleSignOut = async () => {
    try {
      console.log('Starting logout process');
      
      // DEBUG: Log storage keys before logout
      console.log("Keys before logout:", Object.keys(localStorage));
      
      // 1. Call the server-side logout endpoint
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Server logout failed:', await response.text());
      } else {
        console.log('Server logout successful');
      }

      // 2. Aggressively clear all Supabase related localStorage items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.startsWith('sb:') || key.includes('supabase'))) {
          console.log(`Clearing localStorage key: ${key}`);
          localStorage.removeItem(key);
        }
      }
      
      // Clear specific localStorage items we know about
      localStorage.removeItem('sb:session');
      localStorage.removeItem('supabaseSession');
      localStorage.removeItem('supabase.auth.token');
      
      // Get the Supabase URL to handle project-specific keys
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || '';
      if (projectId) {
        localStorage.removeItem(`sb-${projectId}-auth-token`);
      }

      // 3. Clear sessionStorage items
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('sb-') || key.startsWith('sb:') || key.includes('supabase'))) {
          console.log(`Clearing sessionStorage key: ${key}`);
          sessionStorage.removeItem(key);
        }
      }

      // 4. Use Supabase's signOut to clean up the client
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Supabase signOut error:', error.message);
      } else {
        console.log('Supabase signOut successful');
      }

      // 5. Clear cookies by setting them to expired
      const expires = new Date(0).toUTCString();
      document.cookie = `sb-access-token=; expires=${expires}; path=/; domain=${window.location.hostname}; SameSite=Lax`;
      document.cookie = `sb-refresh-token=; expires=${expires}; path=/; domain=${window.location.hostname}; SameSite=Lax`;
      document.cookie = `supabase-auth-token=; expires=${expires}; path=/; domain=${window.location.hostname}; SameSite=Lax`;
      
      // DEBUG: Log storage keys after logout
      console.log("Keys after logout:", Object.keys(localStorage));

      // 6. Force a hard refresh to reset all client state
      setTimeout(() => {
        console.log('Redirecting to login page...');
        // Use replace instead of href to prevent back navigation
        window.location.replace('/login');
      }, 100);
    } catch (error) {
      console.error('Error during sign out:', error);
      // Fallback to direct redirect if there's an error
      window.location.replace('/login');
    }
  };

  // Profile menu component
  function ProfileMenu() {
    if (!session) return null;

    return (
      <div 
        ref={profileMenuRef}
        className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-[100] overflow-hidden"
      >
        <div className="px-4 py-4 border-b border-gray-700 flex items-center gap-3">
          <ProfileAvatar size="large" />
          <div className="overflow-hidden">
            <p className="text-sm text-white font-medium truncate max-w-[180px]">
              {displayName}
            </p>
            <p className="text-xs text-gray-400 truncate max-w-[180px]">
              {session.user?.email || ''}
            </p>
            <Link 
              href="/profile"
              className="text-xs text-amber-500 hover:text-amber-400 mt-1 inline-block"
              onClick={() => setIsProfileOpen(false)}
            >
              View Full Profile
            </Link>
          </div>
        </div>
        
        <div className="py-1">
          <h3 className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Collection
          </h3>
          <MenuLink href="/collection" icon={<User size={16} />} label="My Collection" />
          <MenuLink href="/explore" icon={<Globe size={16} />} label="Explore Collections" />
        </div>
        
        <div className="py-1 border-t border-gray-700">
          <h3 className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Profile Settings
          </h3>
          <MenuLink href="/profile/edit" icon={<Edit size={16} />} label="Edit Profile Details" />
          <MenuLink href="/profile/about" icon={<UserCircle size={16} />} label="Customize Bio & Info" />
          <MenuLink href="/profile/photo" icon={<Camera size={16} />} label="Change Profile Picture" />
          <MenuLink href="/profile/appearance" icon={<Palette size={16} />} label="Profile Appearance" />
        </div>
        
        <div className="py-1 border-t border-gray-700">
          <h3 className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Account & Security
          </h3>
          <MenuLink href="/profile/security" icon={<Shield size={16} />} label="Security Settings" />
          <MenuLink href="/profile/reset-credentials" icon={<RefreshCw size={16} />} label="Reset Credentials" />
        </div>
        
        <div className="py-1 border-t border-gray-700">
          <button 
            className="w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 flex items-center gap-2"
            onClick={handleSignOut}
            data-prefetch="false"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Menu link component
  function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    // Determine if this is a sensitive link that shouldn't be prefetched
    const isSensitiveLink = href.includes('security') || 
                           href.includes('reset-credentials') ||
                           href.includes('password');

    return (
      <Link 
        href={href}
        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
        onClick={() => setIsProfileOpen(false)}
        prefetch={isSensitiveLink ? false : undefined}
      >
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
      </Link>
    );
  }

  // Profile avatar component with error handling
  function ProfileAvatar({ size = "normal" }: { size?: "normal" | "large" | "mobile" }) {
    if (!session?.user) return null;
    
    const sizeClasses = {
      normal: "w-8 h-8",
      large: "w-12 h-12 border-2 border-amber-500",
      mobile: "w-10 h-10"
    };
    
    const dimensions = {
      normal: { width: 32, height: 32 },
      large: { width: 50, height: 50 },
      mobile: { width: 40, height: 40 }
    };
    
    // Use image directly from the session to avoid regenerating the URL
    const profileImageUrl = React.useMemo(() => {
      if (!session.user.image) return '';
      // If already using our image API format, use it directly
      if (session.user.image.startsWith('/api/images')) return session.user.image;
      // Otherwise, use the utility function but without timestamp
      return getProfileImageUrl(session.user.image, false);
    }, [session.user.image]);
    
    return (
      <div className={`${sizeClasses[size]} relative overflow-hidden rounded-full`}>
        <SafeImage 
          src={profileImageUrl}
          alt={`${displayName}'s profile`}
          width={dimensions[size].width}
          height={dimensions[size].height}
          className={`${sizeClasses[size]} object-cover`}
          priority
          useTimestamp={false}
          fallback={
            <div className={`w-full h-full flex items-center justify-center ${DEFAULT_AVATAR_BG} text-white font-bold`}>
              {getInitialLetter(displayName)}
            </div>
          }
        />
      </div>
    );
  }
}