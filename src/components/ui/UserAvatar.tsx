import React from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';
import { getProfileImageUrl, getInitialLetter } from '@/lib/utils';

// Function to generate a deterministic color class from a name
function getColorFromName(name: string | null | undefined): string {
  if (!name) return 'bg-gray-500';
  
  const colorOptions = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-pink-500',
    'bg-purple-500',
    'bg-indigo-500',
    'bg-amber-500',
    'bg-emerald-500',
    'bg-rose-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-orange-500',
  ];
  
  // Use a simple hash function to get a deterministic index
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  // Make sure the result is positive and map to our color array
  const index = Math.abs(hash) % colorOptions.length;
  return colorOptions[index];
}

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  addTimestamp?: boolean; // Whether to add timestamp for cache busting
}

/**
 * A flexible avatar component that displays an image if provided,
 * or falls back to a user's initials or generic icon.
 */
export function UserAvatar({
  src,
  name,
  size = 40,
  className = '',
  addTimestamp = false, // Default to false for better caching
}: UserAvatarProps) {
  // Get the first letter of the user's name for the fallback
  const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : 'U';
  
  // Generate a consistent color based on the name
  const colorClass = getColorFromName(name);
  
  // Process the image URL through the util function if it exists
  const imageUrl = src ? getProfileImageUrl(src, addTimestamp) : null;
  
  if (imageUrl) {
    return (
      <div 
        className={`relative rounded-full overflow-hidden flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={imageUrl}
          alt={name || 'User avatar'}
          width={size}
          height={size}
          className="object-cover"
        />
      </div>
    );
  }
  
  // Fallback to initials avatar
  return (
    <div
      className={`rounded-full ${colorClass} flex items-center justify-center text-white ${className}`}
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}

export default UserAvatar; 