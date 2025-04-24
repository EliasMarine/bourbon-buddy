// Default gradient cover photo
export const DEFAULT_COVER_PHOTO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZCIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzJkMzc0OCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzFhMjAyYyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiLz48L3N2Zz4=';

// Default avatar background for fallback
export const DEFAULT_AVATAR_BG = 'bg-gradient-to-br from-amber-500 to-orange-700';

// Enable this flag to bypass the image API and use direct Supabase URLs
// Useful when troubleshooting image API issues
const USE_DIRECT_URLS = false;

/**
 * Gets the first letter of a name for avatar fallback
 */
export function getInitialLetter(name?: string | null): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

/**
 * Parse a Supabase URL to extract bucket and path
 */
export function parseSupabaseUrl(url?: string | null): { bucket: string, path: string } | null {
  if (!url) return null;
  
  try {
    // Check if it's a Supabase URL
    if (!url.includes('supabase.co') || !url.includes('/storage/v1/object/public/')) {
      return null;
    }

    // Extract the part after /storage/v1/object/public/
    const parts = url.split('/storage/v1/object/public/');
    if (parts.length !== 2) return null;

    // Split the remaining path into bucket and path
    const pathParts = parts[1].split('/');
    if (pathParts.length < 2) return null;

    const bucket = pathParts[0];
    // Join the rest of the path parts and remove any query parameters
    const path = pathParts.slice(1).join('/').split('?')[0];

    return { bucket, path };
  } catch (e) {
    console.error('Failed to parse Supabase URL:', e);
    return null;
  }
}

/**
 * Prepares a Supabase storage URL for direct use or via our image API
 */
export function getStorageUrl(url?: string | null, useDirectUrl = USE_DIRECT_URLS, useTimestamp = false): string {
  if (!url) return '';
  
  // If already using our image API, return as is
  if (url.startsWith('/api/images')) return url;
  
  // If using direct URLs, only add cache buster when explicitly requested
  if (useDirectUrl && url.includes('supabase.co')) {
    const baseUrl = url.split('?')[0];
    return useTimestamp ? `${baseUrl}?t=${Date.now()}` : baseUrl;
  }
  
  // Try to parse as Supabase URL
  const parsed = parseSupabaseUrl(url);
  if (parsed) {
    // Use our image API with optional cache buster
    return useTimestamp 
      ? `/api/images?bucket=${parsed.bucket}&path=${parsed.path}&t=${Date.now()}`
      : `/api/images?bucket=${parsed.bucket}&path=${parsed.path}`;
  }
  
  // Return any other URL as is
  return url;
}

/**
 * Gets a properly formatted cover photo URL
 */
export function getCoverPhotoUrl(url?: string | null, useTimestamp = false): string {
  return getStorageUrl(url, USE_DIRECT_URLS, useTimestamp);
}

/**
 * Gets a properly formatted profile image URL
 */
export function getProfileImageUrl(url?: string | null, useTimestamp = false): string {
  return getStorageUrl(url, USE_DIRECT_URLS, useTimestamp);
}

// File validation constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// File validation utility
export function validateFile(
  file: File | Buffer,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    contentType?: string;
  } = {}
) {
  const maxSize = options.maxSize || MAX_FILE_SIZE;
  const allowedTypes = options.allowedTypes || ALLOWED_FILE_TYPES;
  
  // Validate file size
  if (file instanceof File) {
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit.`
      };
    }
    
    // Validate file type for File objects
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      };
    }
  } else if (file instanceof Buffer) {
    // For Buffer objects, we can only check size unless contentType is provided
    if (file.byteLength > maxSize) {
      return {
        isValid: false,
        error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit.`
      };
    }
    
    // If contentType is provided, validate it
    if (options.contentType && !allowedTypes.includes(options.contentType)) {
      return {
        isValid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      };
    }
  }
  
  return { isValid: true };
}

// HTML sanitization function
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  // Basic sanitization - remove all HTML tags
  // For production, consider using a library like DOMPurify or sanitize-html
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class values into a single class string,
 * with Tailwind CSS conflict resolution.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 