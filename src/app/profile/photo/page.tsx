'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '@/hooks/use-supabase-session';
import { redirect } from 'next/navigation';
import { Camera, Upload, ArrowLeft, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import SafeImage from '@/components/ui/SafeImage';
import Link from 'next/link';
import { getProfileImageUrl, getInitialLetter, DEFAULT_AVATAR_BG } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { validateUserFile } from '@/lib/file-validation';

// Add global window type declaration
declare global {
  interface Window {
    _csrfToken?: string;
  }
}

export default function ProfilePhotoPage() {
  const { data: session, status, update: updateSession } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageUpdateTimestamp, setImageUpdateTimestamp] = useState<number | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [lastAttemptedFile, setLastAttemptedFile] = useState<File | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track session to ensure authentication
  useEffect(() => {
    if (status === 'authenticated' && session) {
      console.log('Profile photo page: authenticated session detected', { 
        userId: session.user.id,
        hasImage: !!session.user.image
      });
    }
  }, [status, session]);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Redirect if not logged in
  if (!session) {
    redirect('/login');
  }

  // Prepare profile image URL using memoization to prevent regeneration on each render
  const profileImageUrl = React.useMemo(() => {
    if (!session?.user?.image) return '';
    // Only use timestamp for cache busting when the profile image was just updated
    const useTimestamp = imageUpdateTimestamp !== null;
    return getProfileImageUrl(session.user.image, useTimestamp);
  }, [session?.user?.image, imageUpdateTimestamp]);

  // Handle file validation
  const checkFileValidation = async (file: File) => {
    try {
      if (!file) {
        console.error('No file provided for validation');
        setValidationResult({
          valid: false,
          details: 'No file provided for validation'
        });
        return false;
      }

      if (file.size === 0) {
        console.error('File is empty (0 bytes)');
        setValidationResult({
          valid: false,
          details: 'File is empty (0 bytes)'
        });
        return false;
      }
      
      const result = await validateUserFile(file);
      setValidationResult(result);
      return result.valid;
    } catch (error) {
      console.error('File validation error:', error);
      setValidationResult({
        valid: false,
        details: 'File validation failed due to an unexpected error.'
      });
      return false;
    }
  };

  // Handle file drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    setLastAttemptedFile(file);
    const isValid = await checkFileValidation(file);
    if (isValid) {
      processAndUploadFile(file);
    }
  };

  // Handle file selection
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setLastAttemptedFile(file);
    const isValid = await checkFileValidation(file);
    if (isValid) {
      processAndUploadFile(file);
    }
  };

  // Retry last upload
  const handleRetry = async () => {
    if (!lastAttemptedFile) {
      toast.error('No file to retry');
      return;
    }
    
    setRetryCount(prevCount => prevCount + 1);
    
    // Check if the file is still valid
    const isValid = await checkFileValidation(lastAttemptedFile);
    if (isValid) {
      toast.success('Retrying upload...');
      processAndUploadFile(lastAttemptedFile);
    } else {
      toast.error('File validation failed on retry. Please select a different file.');
    }
  };

  // Process and upload the file
  const processAndUploadFile = async (file: File) => {
    if (!file) return;
    
    try {
      setIsUploading(true);
      setUploadError(null);
      
      // Ensure user session exists
      if (!session || !session.user) {
        console.error('No active session found. Redirecting to login...');
        toast.error('Session expired. Please log in again.');
        redirect('/login');
        return;
      }
      
      // Log file information for debugging
      console.log('File selected for profile:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      // Add extra validation
      if (file.size === 0) {
        throw new Error('File is empty (0 bytes)');
      }
      
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File is too large (max 5MB)');
      }
      
      // Determine correct file extension and MIME type
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const correctMimeType = 
        fileExt === 'png' ? 'image/png' :
        fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' :
        fileExt === 'gif' ? 'image/gif' :
        fileExt === 'webp' ? 'image/webp' :
        file.type;
        
      // Create a blob to verify the image before uploading
      let processedFile = file;
      
      // If MIME type doesn't match extension, fix it
      if (file.type !== correctMimeType) {
        console.log(`Fixing MIME type for ${fileExt} file: ${file.name} - current type: ${file.type}, correct type: ${correctMimeType}`);
        try {
          // Create a new file with corrected MIME type
          processedFile = new File([file], file.name, { 
            type: correctMimeType,
            lastModified: file.lastModified 
          });
        } catch (error) {
          console.warn("Could not create new File with corrected MIME type - continuing with original file", error);
          // Continue with original file
        }
      }
      
      // Double-check the file is not empty after processing
      if (processedFile.size === 0) {
        throw new Error('Processed file is empty (0 bytes). Original file size: ' + file.size);
      }
      
      // Create a blob URL for verification
      const blobUrl = URL.createObjectURL(processedFile);
      console.log('Created blob URL for verification:', blobUrl);
      
      // Prepare FormData for upload
      const formData = new FormData();
      formData.append('file', processedFile);
      
      // Check FormData was created properly
      const entries = Array.from(formData.entries());
      if (entries.length === 0) {
        throw new Error('FormData is empty after adding file');
      }
      
      console.log('FormData created with file:', {
        name: processedFile.name,
        type: processedFile.type,
        size: processedFile.size,
        entriesCount: entries.length
      });
      
      // Get CSRF token
      let csrfToken = '';
      try {
        if (typeof window !== 'undefined' && window._csrfToken) {
          csrfToken = window._csrfToken;
        } else {
          csrfToken = sessionStorage.getItem('csrfToken') || '';
        }
      } catch (e) {
        console.warn('Failed to get CSRF token:', e);
      }
      
      // Log upload attempt
      console.log('Uploading file:', {
        name: processedFile.name,
        type: processedFile.type,
        size: processedFile.size,
        token: csrfToken ? 'Present' : 'Missing',
        retryNumber: retryCount
      });
      
      // Prepare headers with CSRF token
      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
      
      // Upload the file with timeout handling
      console.log('Starting fetch to /api/upload...');
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers,
          body: formData,
          signal: controller.signal,
          credentials: 'include', // Ensure cookies are sent
        });
        
        // Clear timeout since request completed
        clearTimeout(timeoutId);
        
        console.log('Upload response status:', uploadResponse.status, uploadResponse.statusText);
        
        if (!uploadResponse.ok) {
          let errorMessage = 'Failed to upload image';
          let errorDetails = '';
          
          try {
            // First try as JSON
            const errorJson = await uploadResponse.json();
            console.error('Upload response error (JSON):', errorJson);
            
            errorMessage = errorJson.error || errorMessage;
            errorDetails = errorJson.details || '';
          } catch (jsonError) {
            // If not JSON, try as text
            try {
              const errorText = await uploadResponse.text();
              console.error('Upload response error (Text):', errorText);
              
              if (errorText && errorText.length < 500) {
                errorMessage = errorText;
              }
            } catch (textError) {
              console.error('Could not extract error details from upload response');
            }
          }
          
          setUploadError(errorMessage);
          throw new Error(`${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`);
        }
        
        // Parse upload response
        const uploadData = await uploadResponse.json();
        const imageUrl = uploadData.url;
        
        if (!imageUrl) {
          throw new Error('Upload succeeded but no image URL was returned');
        }
        
        console.log('Upload successful! URL:', imageUrl);
        
        // Update user profile with the new image URL
        const updateResponse = await fetch('/api/user/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
          },
          body: JSON.stringify({ 
            image: imageUrl,
            _csrf: csrfToken // Include token in body as well for extra security
          }),
          credentials: 'include', // Ensure cookies are sent
        });
        
        if (!updateResponse.ok) {
          let errorMessage = 'Failed to update profile';
          
          try {
            const errorData = await updateResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error('Could not extract error details from profile update response');
          }
          
          setUploadError(errorMessage);
          throw new Error(errorMessage);
        }
        
        // Get updated user data
        const userData = await updateResponse.json();
        
        // Update session with new user data
        if (userData.user) {
          await updateSession({
            user: {
              ...session.user,
              image: imageUrl
            }
          });
          
          // Update timestamp to bust the cache
          setImageUpdateTimestamp(Date.now());
          
          // Reset state and show success message
          setValidationResult(null);
          setLastAttemptedFile(null);
          setRetryCount(0);
          toast.success('Profile photo updated successfully');
        } else {
          throw new Error('Profile update succeeded but returned no user data');
        }
      } catch (fetchError) {
        // Handle abort/timeout errors specifically
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          throw new Error('Upload request timed out after 30 seconds. Please try again.');
        }
        
        // Re-throw other errors
        throw fetchError;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      
      // Show friendly error message
      let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Make the message more user-friendly
      if (errorMessage.includes('content does not match declared type')) {
        errorMessage = 'The file format doesn\'t match its extension. Try saving the image in a different format (e.g., JPEG or PNG).';
      } else if (errorMessage.includes('Too Many Requests') || errorMessage.includes('429')) {
        errorMessage = 'You\'ve made too many upload attempts. Please wait a moment and try again.';
      } else if (errorMessage.includes('too large') || errorMessage.includes('exceeds')) {
        errorMessage = 'The file is too large. Please use an image smaller than 5MB.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        errorMessage = 'Upload timed out. The server may be busy. Please try again.';
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = 'Network error occurred. Please check your internet connection and try again.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
        errorMessage = 'Permission error. You may not have access to upload files.';
      }
      
      toast.error(errorMessage);
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gray-800 py-6 px-4 sm:px-6 lg:px-8 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Profile Photo</h1>
          <Link href="/profile" className="flex items-center text-gray-300 hover:text-white">
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </Link>
        </div>
      </div>
      
      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-gray-800 rounded-lg shadow p-6 sm:p-8">
          {/* Profile photo section */}
          <h2 className="text-xl font-medium text-white mb-6">Update your profile photo</h2>
          
          <div className="flex flex-col md:flex-row gap-8 items-center mb-8">
            {/* Current avatar preview */}
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center relative">
              {profileImageUrl ? (
                <SafeImage
                  src={profileImageUrl}
                  alt="Your profile photo"
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div 
                  className="w-32 h-32 flex items-center justify-center text-white text-4xl font-medium"
                  style={{ backgroundColor: DEFAULT_AVATAR_BG }}
                >
                  {getInitialLetter(session.user.name || session.user.email)}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="text-gray-300 mb-6">
                <p className="mb-2">Upload a new photo to update your profile.</p>
                <p className="text-sm text-gray-500">
                  Your photo will be visible to other users. We recommend using a square image for best results.
                </p>
              </div>
              
              {/* File upload area */}
              <div 
                className={`border-2 border-dashed rounded-lg p-6 mb-6 text-center transition-colors ${
                  isDragging 
                    ? 'border-amber-500 bg-amber-500/10' 
                    : 'border-gray-600 hover:border-amber-500/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                
                <Camera size={48} className="mx-auto text-gray-400 mb-4" />
                
                {isUploading ? (
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mb-2"></div>
                    <p className="text-gray-300">Uploading your photo...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-lg font-medium text-white mb-2">
                      Drop your image here, or click to select
                    </p>
                    <p className="text-gray-400 text-sm">
                      Supported formats: PNG, JPEG, GIF, WebP (Max 5MB)
                    </p>
                  </>
                )}
              </div>
              
              {/* Retry button (only shown after a failed upload) */}
              {uploadError && lastAttemptedFile && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUploading}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry Upload</span>
                  </button>
                </div>
              )}
            </div>
          </div>
            
          {/* Validation results */}
          {validationResult && (
            <div className={`p-4 rounded-md ${validationResult.valid ? 'bg-green-900/20' : 'bg-red-900/20'} mt-6`}>
              <div className="flex items-start">
                {validationResult.valid ? (
                  <CheckCircle className="w-6 h-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                )}
                
                <div>
                  <h3 className={`text-lg font-medium ${validationResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                    {validationResult.valid ? 'File Validation Passed' : 'File Validation Failed'}
                  </h3>
                  
                  <div className="mt-2 text-sm text-gray-300 space-y-1">
                    <p><strong>File:</strong> {validationResult.fileInfo?.name} ({Math.round((validationResult.fileInfo?.size || 0) / 1024)}KB)</p>
                    <p><strong>Type:</strong> {validationResult.fileInfo?.type}</p>
                    <p><strong>Detected Format:</strong> {validationResult.detectedFormat}</p>
                    <p><strong>File Header:</strong> <code className="bg-gray-700 px-1 rounded">{validationResult.headerInfo}</code></p>
                    <div className="mt-2 whitespace-pre-wrap text-gray-400">{validationResult.details}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Error display */}
          {uploadError && (
            <div className="bg-red-900/20 p-4 rounded-md mt-6">
              <div className="flex">
                <XCircle className="w-6 h-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-red-400">Upload Failed</h3>
                  <p className="mt-2 text-sm text-gray-300">{uploadError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 