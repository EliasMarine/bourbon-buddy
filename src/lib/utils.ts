// Default gradient cover photo
export const DEFAULT_COVER_PHOTO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZCIgeDI9IjAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzJkMzc0OCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzFhMjAyYyIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JhZCkiLz48L3N2Zz4=';

// Default avatar background color
export const DEFAULT_AVATAR_BG = 'bg-amber-600';

// Get cover photo URL with fallback
export const getCoverPhotoUrl = (coverPhoto?: string | null) => {
  return coverPhoto || DEFAULT_COVER_PHOTO;
};

// Get initial letter for avatar
export const getInitialLetter = (name?: string | null) => {
  return name?.[0]?.toUpperCase() || '?';
};

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