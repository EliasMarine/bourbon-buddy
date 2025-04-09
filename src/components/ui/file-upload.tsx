'use client';

import { useRef, useState } from 'react';
import { useSupabaseStorage, ALLOWED_FILE_TYPES, SIZE_LIMITS } from '@/hooks/use-supabase-storage';
import { X, Upload, Check, Trash2, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete?: (url: string, path: string) => void;
  onError?: (error: string) => void;
  onChange?: (url: string | null) => void;
  defaultValue?: string;
  directory?: string;
  className?: string;
  accept?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  bucket?: string;
  showPreview?: boolean;
  buttonText?: string;
}

export function FileUpload({
  onUploadComplete,
  onError,
  onChange,
  defaultValue,
  directory = '',
  className = '',
  accept = 'image/*',
  maxSizeMB,
  allowedTypes = ALLOWED_FILE_TYPES.IMAGES,
  bucket,
  showPreview = true,
  buttonText = 'Upload file'
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(defaultValue || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    upload,
    remove,
    reset,
    isUploading,
    isLoading,
    progress,
    error,
    url,
    filePath
  } = useSupabaseStorage({
    directory,
    bucket,
    allowedTypes,
    maxSizeBytes: maxSizeMB ? maxSizeMB * 1024 * 1024 : undefined,
    onSuccess: (fileUrl, path) => {
      setPreview(fileUrl);
      onUploadComplete?.(fileUrl, path);
      onChange?.(fileUrl);
    },
    onError: (errorMessage) => {
      onError?.(errorMessage);
    }
  });
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create local preview immediately for better UX
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    
    // Start upload
    const result = await upload(file);
    
    // Revoke the object URL to free memory
    URL.revokeObjectURL(objectUrl);
    
    // If upload failed, clear preview
    if (!result) {
      setPreview(null);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleRemove = async () => {
    if (filePath) {
      await remove(filePath);
    }
    
    setPreview(null);
    onChange?.(null);
    reset();
  };
  
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col gap-4">
        {/* File input (hidden) */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={accept}
          className="hidden"
        />
        
        {/* Upload button */}
        {!preview && (
          <button
            type="button"
            onClick={handleButtonClick}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading... {Math.floor(progress)}%</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>{buttonText}</span>
              </>
            )}
          </button>
        )}
        
        {/* File preview */}
        {showPreview && preview && (
          <div className="relative overflow-hidden border border-gray-200 rounded-md group">
            {preview.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="object-cover w-full h-40"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-40 bg-gray-100">
                <Check className="w-8 h-8 text-green-500" />
                <span className="ml-2 font-medium">File uploaded</span>
              </div>
            )}
            
            <button
              type="button"
              onClick={handleRemove}
              disabled={isLoading}
              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm opacity-70 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 text-red-500" />
              )}
            </button>
          </div>
        )}
        
        {/* Success message */}
        {url && !showPreview && (
          <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-500" />
              <span className="text-sm text-green-700">File uploaded successfully</span>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              disabled={isLoading}
              className="p-1 rounded-full hover:bg-green-100"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4 text-green-700" />
              )}
            </button>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-md">
            <span className="text-sm text-red-700">{error}</span>
            <button
              type="button"
              onClick={() => reset()}
              className="p-1 rounded-full hover:bg-red-100"
            >
              <X className="w-4 h-4 text-red-700" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 