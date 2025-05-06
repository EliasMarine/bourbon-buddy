'use client';

import React, { useState, useRef } from 'react';
import { useSession } from '@/hooks/use-supabase-session';
import { redirect } from 'next/navigation';
import { Camera, Upload, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const isValid = await checkFileValidation(file);
    if (isValid) {
      processAndUploadFile(file);
    }
  };

  // Handle file selection
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const isValid = await checkFileValidation(file);
    if (isValid) {
      processAndUploadFile(file);
    }
  };

  // Process and upload the file
  const processAndUploadFile = async (file: File) => {
    if (!file) return;
    
    try {
      setIsUploading(true);
      setUploadError(null);
      
      // Log file information for debugging
      console.log('File selected for profile:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
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
      
      // Create a blob URL for verification
      const blobUrl = URL.createObjectURL(processedFile);
      console.log('Created blob URL for verification:', blobUrl);
      
      // Prepare FormData for upload
      const formData = new FormData();
      formData.append('file', processedFile);
      console.log('FormData created with file:', {
        name: processedFile.name,
        type: processedFile.type,
        size: processedFile.size
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
        token: csrfToken ? 'Present' : 'Missing'
      });
      
      // Prepare headers with CSRF token
      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
      
      // Upload the file
      console.log('Starting fetch to /api/upload...');
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData,
      });
      
      console.log('Upload response status:', uploadResponse.status, uploadResponse.statusText);
      
      if (!uploadResponse.ok) {
        let errorMessage = 'Failed to upload image';
        
        try {
          const errorText = await uploadResponse.text();
          console.error('Upload response error:', errorText);
          
          try {
            // Try to parse as JSON
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // Not JSON, use text as-is
            if (errorText && errorText.length < 100) {
              errorMessage = errorText;
            }
          }
        } catch (e) {
          console.error('Could not extract error details from upload response');
        }
        
        setUploadError(errorMessage);
        throw new Error(errorMessage);
      }
      
      // Parse upload response
      const uploadData = await uploadResponse.json();
      const imageUrl = uploadData.url;
      
      if (!imageUrl) {
        throw new Error('Upload succeeded but no image URL was returned');
      }
      
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
        toast.success('Profile photo updated successfully');
      } else {
        throw new Error('Profile update succeeded but returned no user data');
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
      }
      
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center mb-6">
            <Link 
              href="/profile" 
              className="text-gray-400 hover:text-white mr-3"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-white">Change Profile Picture</h1>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-6 w-32 h-32 relative rounded-full overflow-hidden border-4 border-gray-700">
                <SafeImage
                  src={profileImageUrl}
                  alt={session.user?.name || 'Profile'}
                  fill
                  className="object-cover"
                  priority
                  useTimestamp={imageUpdateTimestamp !== null}
                  fallback={
                    <div className={`w-full h-full flex items-center justify-center ${DEFAULT_AVATAR_BG} text-white text-4xl font-bold`}>
                      {getInitialLetter(session.user?.name || 'User')}
                    </div>
                  }
                />
              </div>
              
              <h2 className="text-xl font-semibold text-white mb-2">
                {session.user?.name || 'User'}
              </h2>
              <p className="text-gray-400 mb-6">
                {session.user?.email}
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
            
            {/* Validation results */}
            {validationResult && (
              <div className={`border rounded-lg p-4 mb-6 ${
                validationResult.valid 
                  ? 'border-green-500/30 bg-green-500/10' 
                  : 'border-red-500/30 bg-red-500/10'
              }`}>
                <div className="flex items-start">
                  {validationResult.valid ? (
                    <CheckCircle className="text-green-500 mr-3 mt-0.5 flex-shrink-0" size={20} />
                  ) : (
                    <XCircle className="text-red-500 mr-3 mt-0.5 flex-shrink-0" size={20} />
                  )}
                  <div>
                    <h3 className={`font-medium ${validationResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                      {validationResult.valid ? 'File validated successfully' : 'File validation failed'}
                    </h3>
                    <p className="text-gray-300 mt-1 text-sm">
                      {validationResult.detectedFormat !== 'unknown' && 
                        `Detected format: ${validationResult.detectedFormat}`}
                    </p>
                    <pre className="mt-2 text-xs font-mono bg-gray-900/50 p-2 rounded whitespace-pre-wrap text-gray-400 overflow-auto max-h-40">
                      {validationResult.details}
                    </pre>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error display */}
            {uploadError && (
              <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 mb-6">
                <div className="flex">
                  <XCircle className="text-red-500 mr-3 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-medium text-red-400">Upload failed</h3>
                    <p className="text-gray-300 mt-1">
                      {uploadError}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-sm text-gray-400 bg-gray-800/50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-300 mb-2">Tips for success:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use a square image for best results</li>
                <li>Make sure the file extension matches the actual format</li>
                <li>Avoid using screenshots or images from messaging apps which might have been recompressed</li>
                <li>If you're having trouble with a PNG, try saving it as a JPEG</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 