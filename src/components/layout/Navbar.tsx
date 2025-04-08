'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { 
  Menu, X, User, LogOut, Home, BookOpen, 
  Tv, ChevronDown, Camera, Key, Settings,
  Shield, UserCircle, Edit, RefreshCw, Palette,
  Globe, DollarSign, HelpCircle
} from 'lucide-react';
import GlencairnGlass from '../ui/icons/GlencairnGlass';
import { getProfileImageUrl, getInitialLetter, DEFAULT_AVATAR_BG } from '@/lib/utils';
import SafeImage from '@/components/ui/SafeImage';
import { createSupabaseBrowserClient } from '@/lib/supabase';

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showFloatingNav, setShowFloatingNav] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const lastScrollY = useRef(0);

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
    { name: 'Pricing', href: '/pricing', icon: <DollarSign size={18} /> },
    { name: 'About', href: '/about', icon: <BookOpen size={18} /> },
  ];

  const isActive = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  };

  // Enhanced sign out function that handles both NextAuth and Supabase
  const handleSignOut = async () => {
    try {
      // First, call our custom logout API endpoint to clear cookies on the server
      const logoutResponse = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!logoutResponse.ok) {
        console.error('Server logout failed:', await logoutResponse.text());
      }
      
      // Get the Supabase client to clear browser state
      const supabase = createSupabaseBrowserClient();
      
      // Sign out from Supabase client-side
      await supabase.auth.signOut();
      
      // Clear UI state
      setIsProfileOpen(false);
      setIsMobileMenuOpen(false);
      
      // Use NextAuth's signOut for final cleanup and redirect
      await signOut({ callbackUrl: '/', redirect: true });
    } catch (error) {
      console.error('Error during sign out:', error);
      // If something fails, try basic sign out
      await signOut({ callbackUrl: '/' });
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
              {session.user?.name || 'User'}
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
    return (
      <Link 
        href={href}
        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
        onClick={() => setIsProfileOpen(false)}
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
          alt={`${session.user.name || 'User'}'s profile`}
          width={dimensions[size].width}
          height={dimensions[size].height}
          className={`${sizeClasses[size]} object-cover`}
          priority
          useTimestamp={false}
          fallback={
            <div className={`w-full h-full flex items-center justify-center ${DEFAULT_AVATAR_BG} text-white font-bold`}>
              {getInitialLetter(session.user.name)}
            </div>
          }
        />
      </div>
    );
  }

  // Mobile menu profile section
  function MobileProfileSection() {
    if (!session) return null;
    
    return (
      <div className="mt-4 border-t border-gray-800 pt-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-4">
          <ProfileAvatar size="mobile" />
          <div className="overflow-hidden max-w-[70%]">
            <p className="font-medium text-white truncate max-w-full">{session.user?.name}</p>
            <p className="text-xs text-gray-400 truncate max-w-full">{session.user?.email}</p>
            <Link 
              href="/profile"
              className="text-xs text-amber-500 hover:text-amber-400 mt-1 inline-block"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              View Full Profile
            </Link>
          </div>
        </div>

        <div className="mb-3">
          <h3 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Profile Settings
          </h3>
          
          <MobileMenuLink href="/profile/edit" icon={<Edit size={18} />} label="Edit Profile Details" />
          <MobileMenuLink href="/profile/about" icon={<UserCircle size={18} />} label="Customize Bio & Info" />
          <MobileMenuLink href="/profile/photo" icon={<Camera size={18} />} label="Change Profile Picture" />
          <MobileMenuLink href="/profile/appearance" icon={<Palette size={18} />} label="Profile Appearance" />
        </div>
        
        <div className="mb-3">
          <h3 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Account & Security
          </h3>
          
          <MobileMenuLink href="/profile/security" icon={<Shield size={18} />} label="Security Settings" />
          <MobileMenuLink href="/profile/reset-credentials" icon={<RefreshCw size={18} />} label="Reset Credentials" />
        </div>
        
        <button
          className="w-full mt-2 px-3 py-2.5 rounded-lg font-medium flex items-center text-red-400 hover:text-red-300 hover:bg-gray-800/50"
          onClick={handleSignOut}
        >
          <LogOut className="mr-3" size={18} />
          Sign Out
        </button>
      </div>
    );
  }

  // Mobile menu link component
  function MobileMenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
      <Link
        href={href}
        className="px-3 py-2.5 rounded-lg font-medium flex items-center text-gray-300 hover:text-white hover:bg-gray-800/50"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <span className="mr-3">{icon}</span>
        {label}
      </Link>
    );
  }

  return (
    <>
      {/* Main Navbar */}
      <header 
        className={`fixed w-full top-0 z-[9999] transition-all duration-300 ${
          isScrolled || isMobileMenuOpen 
            ? 'bg-gray-900/95 backdrop-blur-md shadow-md' 
            : 'bg-gray-900/0'
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="text-white font-bold text-xl flex items-center">
              <div className="flex items-center">
                <Image
                  src="/images/svg%20logo%20icon/Glencairn/Bourbon%20Budy%20(200%20x%2050%20px)%20(Logo)(1).svg"
                  alt="Bourbon Buddy Logo"
                  width={48}
                  height={48}
                  priority
                />
                <span className="pl-0 -ml-2">Bourbon Buddy</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-base font-medium flex items-center ${
                    isActive(link.href)
                      ? isScrolled 
                        ? 'text-amber-500 bg-gray-800' 
                        : 'text-amber-500 bg-gray-900/50'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Authentication/Profile Section */}
            <div className="hidden md:flex items-center">
              {status === 'loading' ? (
                <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse"></div>
              ) : session ? (
                <div className="relative">
                  <button
                    ref={profileButtonRef}
                    className={`flex items-center gap-2 ${
                      isScrolled 
                        ? 'bg-gray-800 hover:bg-gray-700' 
                        : 'bg-gray-900/50 hover:bg-gray-800/70'
                    } px-3 py-1.5 rounded-lg text-sm font-medium transition-colors`}
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                  >
                    <ProfileAvatar />
                    <span className="text-white max-w-[120px] truncate">
                      {session.user?.name || 'User'}
                    </span>
                    <ChevronDown 
                      size={16} 
                      className={`transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  {isProfileOpen && <ProfileMenu />}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                      isScrolled 
                        ? 'bg-gray-800 hover:bg-gray-700' 
                        : 'bg-gray-900/50 hover:bg-gray-800/70'
                    } transition-colors`}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-amber-600 hover:bg-amber-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className={`md:hidden p-2 rounded-lg text-gray-400 hover:text-white ${
                isScrolled 
                  ? 'hover:bg-gray-800' 
                  : 'hover:bg-gray-800/50'
              }`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800">
            <div className="container mx-auto px-4 py-3">
              <nav className="grid gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-4 py-3 rounded-lg text-base font-medium flex items-center ${
                      isActive(link.href)
                        ? 'text-amber-500 bg-gray-800'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mr-3">{link.icon}</span>
                    {link.name}
                  </Link>
                ))}

                {/* Mobile Authentication */}
                {status !== 'loading' && (
                  <>
                    {!session ? (
                      <div className="mt-4 grid gap-2">
                        <Link
                          href="/login"
                          className="px-3 py-2.5 rounded-lg text-center font-medium text-white bg-gray-800 hover:bg-gray-700"
                        >
                          Sign In
                        </Link>
                        <Link
                          href="/signup"
                          className="px-3 py-2.5 rounded-lg text-center font-medium text-white bg-amber-600 hover:bg-amber-700"
                        >
                          Sign Up
                        </Link>
                      </div>
                    ) : (
                      <MobileProfileSection />
                    )}
                  </>
                )}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Floating Navigation */}
      <div 
        className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9998] transition-all duration-500 ${
          showFloatingNav 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-20 opacity-0 pointer-events-none'
        }`}
      >
        <nav className="flex items-center bg-gray-800/95 backdrop-blur-md rounded-full px-2 py-1.5 shadow-lg border border-gray-700">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`p-2 rounded-full mx-1 flex items-center justify-center transition-colors ${
                isActive(link.href) 
                  ? 'bg-amber-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              title={link.name}
            >
              {React.cloneElement(link.icon, { size: 22 })}
              <span className="sr-only">{link.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}