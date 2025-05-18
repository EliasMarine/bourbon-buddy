import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CSSProperties } from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Get the CSP nonce from the meta tag
export function getNonce(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  
  const nonceMeta = document.querySelector('meta[property="csp-nonce"]');
  return nonceMeta ? nonceMeta.getAttribute('content') || undefined : undefined;
}

// Helper function to create style props with nonce
export function nonceStyle(styles: CSSProperties): { style: CSSProperties, nonce?: string } {
  return {
    style: styles,
    nonce: getNonce()
  };
}

// Default background color for avatar
export const DEFAULT_AVATAR_BG = '#1E293B'; // Slate-800

// Get initial letter from name or email
export function getInitialLetter(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    return name.trim().charAt(0).toUpperCase();
  }
  if (email?.trim()) {
    return email.trim().charAt(0).toUpperCase();
  }
  return '?';
}

// Get profile image URL with optional timestamp to prevent caching
export function getProfileImageUrl(imageUrl?: string | null, addTimestamp = false): string | null {
  if (!imageUrl) return null;
  
  if (addTimestamp) {
    // Add timestamp to prevent caching
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}t=${Date.now()}`;
  }
  
  return imageUrl;
}

// Get cover photo URL with optional timestamp
export function getCoverPhotoUrl(coverUrl?: string | null, addTimestamp = false): string | null {
  return getProfileImageUrl(coverUrl, addTimestamp);
}

// Add file validation function
export function validateFile(file: File) {
  // Check if file exists
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 5MB limit' };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'File type not supported. Please use JPEG, PNG, WebP, or GIF' };
  }

  return { isValid: true, error: null };
}

// Add HTML sanitization function
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  // This is a simple implementation - for production, consider using DOMPurify or sanitize-html
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
