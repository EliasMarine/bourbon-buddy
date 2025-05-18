import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Default background color for avatars when no image is available
export const DEFAULT_AVATAR_BG = "bg-amber-600"

/**
 * Gets the initial letter for avatar fallback
 * Uses name if available, falls back to email, then returns '?' if neither is available
 */
export function getInitialLetter(name?: string | null, email?: string | null): string {
  if (name && name.length > 0) {
    return name.charAt(0).toUpperCase()
  }
  
  if (email && email.length > 0) {
    return email.charAt(0).toUpperCase()
  }
  
  return "?"
}

/**
 * Gets the profile image URL with optional timestamp to prevent caching
 */
export function getProfileImageUrl(imageId: string | null, addTimestamp = true): string {
  if (!imageId) return ""
  
  // If already a full URL, add cache busting if needed
  if (imageId.startsWith('http')) {
    if (addTimestamp) {
      // Add cache busting parameter for external URLs too
      const separator = imageId.includes('?') ? '&' : '?'
      return `${imageId}${separator}t=${Date.now()}`
    }
    return imageId
  }
  
  // If already an API path, just add timestamp if needed
  if (imageId.startsWith('/api/images')) {
    if (addTimestamp) {
      const separator = imageId.includes('?') ? '&' : '?'
      return `${imageId}${separator}t=${Date.now()}`
    }
    return imageId
  }
  
  // Check if it's a Supabase storage path
  if (imageId.includes('user-uploads/') || imageId.includes('/avatars/')) {
    // It's likely a Supabase path - construct the proper URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/bourbon-buddy-prod/${imageId}`;
    
    if (addTimestamp) {
      return `${publicUrl}?t=${Date.now()}`;
    }
    return publicUrl;
  }
  
  // Otherwise, construct API path
  const baseUrl = `/api/images/profile/${imageId}`
  return addTimestamp ? `${baseUrl}?t=${Date.now()}` : baseUrl
}

/**
 * Gets the cover photo URL with optional timestamp to prevent caching
 */
export function getCoverPhotoUrl(photoId: string | null, addTimestamp = true): string {
  if (!photoId) return ""
  
  // If already a full URL, return as is
  if (photoId.startsWith('http')) return photoId
  
  // If already an API path, just add timestamp if needed
  if (photoId.startsWith('/api/images')) {
    if (addTimestamp) {
      const separator = photoId.includes('?') ? '&' : '?'
      return `${photoId}${separator}t=${Date.now()}`
    }
    return photoId
  }
  
  // Otherwise, construct API path
  const baseUrl = `/api/images/covers/${photoId}`
  return addTimestamp ? `${baseUrl}?t=${Date.now()}` : baseUrl
}

/**
 * Validates a file to ensure it meets size and type requirements
 * @param file The file to validate
 * @returns An object with validation result
 */
export function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds the maximum allowed (5MB). Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    };
  }

  // Check file type (only images)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only image files (JPEG, PNG, GIF, WebP) are allowed'
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html The HTML string to sanitize
 * @returns The sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Simple sanitization - remove script tags and potentially dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '') // Remove on* attributes
    .replace(/javascript:[^"']+/g, '') // Remove javascript: protocol
    .trim();
}
