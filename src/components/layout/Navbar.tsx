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
  Globe
} from 'lucide-react';
import GlencairnGlass from '../ui/icons/GlencairnGlass';

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showFloatingNav, setShowFloatingNav] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
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
        profileDropdownRef.current && 
        profileButtonRef.current && 
        !profileDropdownRef.current.contains(event.target as Node) && 
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navLinks = [
    { name: 'Home', href: '/', icon: <Home size={18} /> },
    { name: 'My Collection', href: '/collection', icon: <User size={18} /> },
    { name: 'Explore', href: '/explore', icon: <Globe size={18} /> },
    { name: 'Live Tastings', href: '/streams', icon: <Tv size={18} /> },
    { name: 'About', href: '/about', icon: <BookOpen size={18} /> },
  ];

  const isActive = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  };

  // Get user profile picture
  const getProfileImage = () => {
    if (session?.user?.image) {
      return (
        <Image 
          src={`${session.user.image}${session.user.image?.includes('?') ? '&' : '?'}_cb=${Date.now()}`}
          alt="Profile" 
          width={32} 
          height={32} 
          className="w-8 h-8 rounded-full object-cover"
        />
      );
    }
    
    return (
      <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-500 font-bold">
        {session?.user?.name?.[0].toUpperCase() || 'U'}
      </div>
    );
  };
  
  // Mobile version of profile image
  const getMobileProfileImage = () => {
    if (session?.user?.image) {
      return (
        <Image 
          src={`${session.user.image}${session.user.image?.includes('?') ? '&' : '?'}_cb=${Date.now()}`}
          alt="Profile" 
          width={40} 
          height={40} 
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }
    
    return (
      <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-500 font-bold">
        {session?.user?.name?.[0].toUpperCase() || 'U'}
      </div>
    );
  };

  return (
    <>
      {/* Main Navbar */}
      <header 
        className={`fixed w-full top-0 z-50 transition-all duration-300 ${
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
                  src="/images/svg logo icon/Glencairn/Bourbon Budy (200 x 50 px) (Logo)(1).svg"
                  alt="Bourbon Buddy Logo"
                  width={48}
                  height={48}
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
                  >
                    {getProfileImage()}
                    <span className="text-white max-w-[120px] truncate">
                      {session.user?.name || 'User'}
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isProfileOpen && (
                    <div 
                      ref={profileDropdownRef}
                      className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-lg py-1 z-10 border border-gray-700"
                    >
                      <div className="px-4 py-4 border-b border-gray-700 flex items-center gap-3">
                        {session.user?.image ? (
                          <Image 
                            src={`${session.user.image}${session.user.image?.includes('?') ? '&' : '?'}_cb=${Date.now()}`}
                            alt="Profile" 
                            width={50} 
                            height={50} 
                            className="w-12 h-12 rounded-full object-cover border-2 border-amber-500"
                            unoptimized={true}
                            priority={true}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-500 font-bold text-xl">
                            {session.user?.name?.[0].toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="w-full overflow-hidden">
                          <p className="text-sm text-white font-medium truncate max-w-[180px]">{session.user?.name}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[180px]">{session.user?.email}</p>
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
                        <Link 
                          href="/collection"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            <User size={16} />
                            My Collection
                          </span>
                        </Link>
                        
                        <Link 
                          href="/explore"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            <Globe size={16} />
                            Explore Collections
                          </span>
                        </Link>
                      </div>
                      
                      <div className="py-1 border-t border-gray-700">
                        <h3 className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Profile Settings
                        </h3>
                        
                        <Link 
                          href="/profile/edit"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            <Edit size={16} />
                            Edit Profile Details
                          </span>
                        </Link>
                        
                        <Link 
                          href="/profile/about"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            <UserCircle size={16} />
                            Customize Bio & Info
                          </span>
                        </Link>
                        
                        <Link 
                          href="/profile/photo"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            <Camera size={16} />
                            Change Profile Picture
                          </span>
                        </Link>
                        
                        <Link 
                          href="/profile/appearance"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            <Palette size={16} />
                            Profile Appearance
                          </span>
                        </Link>
                      </div>
                      
                      <div className="py-1 border-t border-gray-700">
                        <h3 className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Account & Security
                        </h3>
                        
                        <Link 
                          href="/profile/security"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            <Shield size={16} />
                            Security Settings
                          </span>
                        </Link>
                        
                        <Link 
                          href="/profile/reset-credentials"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            <RefreshCw size={16} />
                            Reset Credentials
                          </span>
                        </Link>
                      </div>
                      
                      <div className="border-t border-gray-700 mt-1 pt-1">
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300"
                          onClick={() => {
                            signOut({ callbackUrl: '/' });
                            setIsProfileOpen(false);
                          }}
                        >
                          <span className="flex items-center gap-2">
                            <LogOut size={16} />
                            Sign Out
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
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
                      <div className="mt-4 border-t border-gray-800 pt-4">
                        <div className="flex items-center gap-3 px-3 py-2 mb-4">
                          {getMobileProfileImage()}
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
                          
                          <Link
                            href="/profile/edit"
                            className="px-3 py-2.5 rounded-lg font-medium flex items-center text-gray-300 hover:text-white hover:bg-gray-800/50"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Edit className="mr-3" size={18} />
                            Edit Profile Details
                          </Link>
                          
                          <Link
                            href="/profile/about"
                            className="px-3 py-2.5 rounded-lg font-medium flex items-center text-gray-300 hover:text-white hover:bg-gray-800/50"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <UserCircle className="mr-3" size={18} />
                            Customize Bio & Info
                          </Link>
                          
                          <Link
                            href="/profile/photo"
                            className="px-3 py-2.5 rounded-lg font-medium flex items-center text-gray-300 hover:text-white hover:bg-gray-800/50"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Camera className="mr-3" size={18} />
                            Change Profile Picture
                          </Link>
                          
                          <Link
                            href="/profile/appearance"
                            className="px-3 py-2.5 rounded-lg font-medium flex items-center text-gray-300 hover:text-white hover:bg-gray-800/50"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Palette className="mr-3" size={18} />
                            Profile Appearance
                          </Link>
                        </div>
                        
                        <div className="mb-3">
                          <h3 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Account & Security
                          </h3>
                          
                          <Link
                            href="/profile/security"
                            className="px-3 py-2.5 rounded-lg font-medium flex items-center text-gray-300 hover:text-white hover:bg-gray-800/50"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Shield className="mr-3" size={18} />
                            Security Settings
                          </Link>
                          
                          <Link
                            href="/profile/reset-credentials"
                            className="px-3 py-2.5 rounded-lg font-medium flex items-center text-gray-300 hover:text-white hover:bg-gray-800/50"
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <RefreshCw className="mr-3" size={18} />
                            Reset Credentials
                          </Link>
                        </div>
                        
                        <button
                          className="w-full mt-2 px-3 py-2.5 rounded-lg font-medium flex items-center text-red-400 hover:text-red-300 hover:bg-gray-800/50"
                          onClick={() => signOut({ callbackUrl: '/' })}
                        >
                          <LogOut className="mr-3" size={18} />
                          Sign Out
                        </button>
                      </div>
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
        className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ${
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
          
          {session && (
            <button
              className="p-2 rounded-full mx-1 flex items-center justify-center text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              title="Profile"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <User size={22} />
              <span className="sr-only">Profile</span>
            </button>
          )}
        </nav>
      </div>
    </>
  );
}