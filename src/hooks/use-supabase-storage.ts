'use client';

import { useState } from 'react';
import { 
  uploadFileWithValidation, 
  downloadFile, 
  removeFiles, 
  getImageUrl,
  ALLOWED_FILE_TYPES,
  SIZE_LIMITS
} from '@/utils/storage';

interface UseSupabaseStorageOptions {
  directory?: string;
  bucket?: string;
  allowedTypes?: string[];
  maxSizeBytes?: number;
  onSuccess?: (url: string, path: string) => void;
  onError?: (error: string) => void;
}

export function useSupabaseStorage(options?: UseSupabaseStorageOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  
  /**
   * Upload a file with progress tracking
   */
  const upload = async (
    file: File,
    uploadOptions?: {
      path?: string;
      upsert?: boolean;
      directory?: string;
      addTimestamp?: boolean;
    }
  ) => {
    if (!file) return;
    
    setError(null);
    setIsUploading(true);
    setProgress(0);
    
    try {
      // Start progress simulation
      const progressInterval = simulateProgress();
      
      const result = await uploadFileWithValidation(file, {
        path: uploadOptions?.path,
        directory: uploadOptions?.directory || options?.directory,
        allowedTypes: options?.allowedTypes,
        maxSizeBytes: options?.maxSizeBytes,
        upsert: uploadOptions?.upsert,
        bucket: options?.bucket,
        addTimestamp: uploadOptions?.addTimestamp
      });
      
      // Clear progress simulation
      clearInterval(progressInterval);
      
      if (result.error) {
        setError(result.error);
        setProgress(0);
        options?.onError?.(result.error);
        return null;
      }
      
      setProgress(100);
      
      // Get the file path from result
      const path = result.data?.path;
      if (path) {
        setFilePath(path);
        
        // Generate the public URL
        const fileUrl = getImageUrl(path, { bucket: options?.bucket });
        setUrl(fileUrl);
        
        // Call onSuccess callback if provided
        options?.onSuccess?.(fileUrl, path);
        
        return { url: fileUrl, path };
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      options?.onError?.(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  /**
   * Delete a file
   */
  const remove = async (path: string | string[]) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await removeFiles(path, { bucket: options?.bucket });
      
      if (result.error) {
        setError(result.error.message);
        options?.onError?.(result.error.message);
        return false;
      }
      
      // If we're deleting the current file, reset state
      if (filePath && (path === filePath || (Array.isArray(path) && path.includes(filePath)))) {
        setUrl(null);
        setFilePath(null);
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      options?.onError?.(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Download a file
   */
  const download = async (
    path: string,
    downloadOptions?: { 
      fileName?: string;
      transform?: { width?: number; height?: number; quality?: number };
    }
  ) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await downloadFile(path, {
        bucket: options?.bucket,
        transform: downloadOptions?.transform
      });
      
      if (result.error) {
        setError(result.error.message);
        options?.onError?.(result.error.message);
        return null;
      }
      
      // Create blob URL and trigger download
      const blob = result.data;
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = downloadOptions?.fileName || path.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      
      return blob;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      options?.onError?.(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Reset the state
   */
  const reset = () => {
    setError(null);
    setIsUploading(false);
    setIsLoading(false);
    setProgress(0);
    setUrl(null);
    setFilePath(null);
  };
  
  /**
   * Helper function to simulate progress for better UX
   */
  const simulateProgress = () => {
    setProgress(0);
    
    // Simulate progress up to 90% while waiting for actual upload to complete
    return setInterval(() => {
      setProgress(prev => {
        const increment = Math.random() * 10;
        const nextProgress = prev + increment;
        return nextProgress >= 90 ? 90 : nextProgress;
      });
    }, 300);
  };
  
  return {
    upload,
    remove,
    download,
    reset,
    isUploading,
    isLoading,
    progress,
    error,
    url,
    filePath
  };
}

// Re-export types and constants for convenience
export { ALLOWED_FILE_TYPES, SIZE_LIMITS }; 