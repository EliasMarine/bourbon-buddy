import React from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

/**
 * A flexible avatar component that displays an image if provided,
 * or falls back to a user's initials or generic icon.
 */
export default function UserAvatar({
  src,
  name,
  size = 40,
  className = '',
}: UserAvatarProps) {
  // Get the first letter of the user's name for the fallback
  const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : 'U';
  
  // Generate a consistent color based on the name
  const getColorFromName = (name?: string | null): string => {
    if (!name) return 'bg-amber-600';
    
    const colors = [
      'bg-amber-600',
      'bg-red-600',
      'bg-blue-600',
      'bg-green-600',
      'bg-purple-600',
      'bg-pink-600',
      'bg-indigo-600',
      'bg-teal-600',
    ];
    
    // Use a simple hash of the name to pick a color
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };
  
  const colorClass = getColorFromName(name);
  
  if (src) {
    return (
      <div 
        className={`relative rounded-full overflow-hidden ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={name || 'User avatar'}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }
  
  // Render a fallback with the user's initial
  if (name) {
    return (
      <div 
        className={`${colorClass} rounded-full flex items-center justify-center text-white font-bold ${className}`}
        style={{ width: size, height: size }}
      >
        <span style={{ fontSize: size * 0.4 }}>{initial}</span>
      </div>
    );
  }
  
  // Render a generic user icon as a last resort
  return (
    <div 
      className={`bg-gray-700 rounded-full flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <User 
        className="text-gray-400"
        size={size * 0.6}
      />
    </div>
  );
} 