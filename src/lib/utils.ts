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
  
  // If already a full URL, return as is
  if (imageId.startsWith('http')) return imageId
  
  // If already an API path, just add timestamp if needed
  if (imageId.startsWith('/api/images')) {
    if (addTimestamp) {
      const separator = imageId.includes('?') ? '&' : '?'
      return `${imageId}${separator}t=${Date.now()}`
    }
    return imageId
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
