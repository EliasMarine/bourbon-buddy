import React from 'react';
import Link from 'next/link';
import { Github, Instagram, Twitter } from 'lucide-react';
import GlencairnGlass from '../ui/icons/GlencairnGlass';

export default function Footer() {
  const navigation = {
    main: [
      { name: 'Home', href: '/' },
      { name: 'Collection', href: '/collection' },
      { name: 'Live Tastings', href: '/streams' },
      { name: 'About', href: '/about' },
    ],
    account: [
      { name: 'Sign In', href: '/login' },
      { name: 'Create Account', href: '/signup' },
    ],
    legal: [
      { name: 'Privacy', href: '#' },
      { name: 'Terms', href: '#' },
    ],
  };

  const socialLinks = [
    { name: 'Twitter', href: '#', icon: Twitter },
    { name: 'Instagram', href: '#', icon: Instagram },
    { name: 'GitHub', href: '#', icon: Github },
  ];

  return (
    <footer className="bg-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="text-white font-bold text-xl flex items-center">
              <GlencairnGlass className="w-6 h-6 mr-2 text-amber-500" fillLevel={70} fillColor="#d97706" />
              <span>Bourbon Buddy</span>
            </Link>
            <p className="mt-4 text-sm text-gray-400 max-w-xs">
              The premier platform for tracking your whiskey collection and connecting with fellow enthusiasts.
            </p>
          </div>
          
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
                Navigation
              </h3>
              <ul className="space-y-2">
                {navigation.main.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-gray-400 hover:text-amber-500 transition-colors">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
                Account
              </h3>
              <ul className="space-y-2">
                {navigation.account.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-gray-400 hover:text-amber-500 transition-colors">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
              
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mt-8 mb-4">
                Legal
              </h3>
              <ul className="space-y-2">
                {navigation.legal.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="text-gray-400 hover:text-amber-500 transition-colors">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
                Connect
              </h3>
              <div className="flex space-x-4">
                {socialLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a 
                      key={item.name}
                      href={item.href}
                      className="text-gray-400 hover:text-amber-500 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="sr-only">{item.name}</span>
                      <Icon className="h-6 w-6" />
                    </a>
                  );
                })}
              </div>
              
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
                  Subscribe to our newsletter
                </h3>
                <div className="flex rounded-md">
                  <input
                    type="email"
                    className="min-w-0 flex-1 bg-gray-700 border-0 text-white py-2 px-3 rounded-l-md placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Email address"
                  />
                  <button
                    className="bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded-r-md transition-colors"
                  >
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-700">
          <p className="text-sm text-gray-400 text-center">
            &copy; {new Date().getFullYear()} Bourbon Buddy. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
} 