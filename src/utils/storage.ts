import { 
  STORAGE_BUCKET, 
  uploadFile, 
  downloadFile, 
  getStorageUrl, 
  listFiles, 
  removeFiles 
} from '@/lib/supabase';

/**
 * Default allowed MIME types
 */
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  DOCUMENTS: ['application/pdf'],
  ALL: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
};

/**
 * Default size limits in bytes
 */
export const SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  DEFAULT: 20 * 1024 * 1024, // 20MB
};

/**
 * Validates a file based on type and size
 */
export function validateFile(
  file: File, 
  options?: { 
    allowedTypes?: string[],
    maxSizeBytes?: number 
  }
): { valid: boolean, error?: string } {
  const allowedTypes = options?.allowedTypes || ALLOWED_FILE_TYPES.ALL;
  const maxSize = options?.maxSizeBytes || SIZE_LIMITS.DEFAULT;
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }
  
  // Check file size
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB` 
    };
  }
  
  return { valid: true };
}

/**
 * Generates a unique file path for storage
 */
export function generateFilePath(
  filename: string, 
  options?: { 
    directory?: string,
    addTimestamp?: boolean 
  }
): string {
  const ext = filename.split('.').pop() || '';
  const baseName = filename.split('.').slice(0, -1).join('.');
  const sanitizedName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-');
    
  const timestamp = options?.addTimestamp ? `-${Date.now()}` : '';
  const directory = options?.directory ? `${options.directory}/` : '';
  
  return `${directory}${sanitizedName}${timestamp}.${ext}`;
}

/**
 * Uploads a file with validation
 */
export async function uploadFileWithValidation(
  file: File,
  options?: {
    path?: string,
    directory?: string,
    allowedTypes?: string[],
    maxSizeBytes?: number,
    upsert?: boolean,
    bucket?: string,
    addTimestamp?: boolean
  }
) {
  // Validate the file
  const validation = validateFile(file, {
    allowedTypes: options?.allowedTypes,
    maxSizeBytes: options?.maxSizeBytes
  });
  
  if (!validation.valid) {
    return { data: null, error: validation.error };
  }
  
  // Generate file path if not provided
  const path = options?.path || generateFilePath(file.name, {
    directory: options?.directory,
    addTimestamp: options?.addTimestamp ?? true
  });
  
  // Upload the file
  return uploadFile(path, file, {
    bucket: options?.bucket || STORAGE_BUCKET,
    upsert: options?.upsert,
    contentType: file.type
  });
}

/**
 * Helper to create a full image storage URL with transformation options
 */
export function getImageUrl(
  path: string,
  options?: {
    width?: number,
    height?: number,
    quality?: number,
    bucket?: string
  }
) {
  const baseUrl = getStorageUrl(options?.bucket, path);
  
  // If no transformations, return the base URL
  if (!options?.width && !options?.height && !options?.quality) {
    return baseUrl;
  }
  
  // Add transformation parameters
  const params = new URLSearchParams();
  
  if (options?.width) params.append('width', options.width.toString());
  if (options?.height) params.append('height', options.height.toString());
  if (options?.quality) params.append('quality', options.quality.toString());
  
  return `${baseUrl}?${params.toString()}`;
}

// Re-export storage functions from supabase.ts
export {
  uploadFile,
  downloadFile,
  getStorageUrl,
  listFiles,
  removeFiles,
  STORAGE_BUCKET
}; 