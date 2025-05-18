import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
