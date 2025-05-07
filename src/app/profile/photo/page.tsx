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
// Import server action
import { updateUserProfile } from '@/lib/actions/profile.actions';
// Import Supabase client for direct metadata updates
import { useSupabase } from '@/components/providers/SupabaseProvider';

// Add global window type declaration
declare global {
  interface Window {
    _csrfToken?: string;
  }
}

export default function ProfilePhotoPage() {
  const { data: session, status, update: updateSession, refreshAvatar } = useSession();
  const { supabase } = useSupabase();
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

  // Drop zone event handlers
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };
  
  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };
  
  const handleFileSelection = async (file: File) => {
    setUploadError(null);
    setValidationResult(null);
    setLastAttemptedFile(file);
    
    // Basic client-side validation
    const validationResult = await validateUserFile(file);
    
    if (!validationResult.valid) {
      setValidationResult(validationResult);
      setUploadError(validationResult.details);
      return;
    }
    
    // Proceed with upload
    processAndUploadFile(file);
  };
  
  const processAndUploadFile = async (file: File) => {
    if (isUploading) {
      console.warn('Upload already in progress, ignoring request');
      return;
    }
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'profile');
      formData.append('userId', session.user.id);
      
      // Add CSRF token if available
      if (window._csrfToken) {
        formData.append('csrfToken', window._csrfToken);
      }
      
      // Upload the file
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', uploadResponse.status, errorText);
        throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
      }
      
      const uploadData = await uploadResponse.json();
      
      // Debug log the full upload response
      console.log('Upload response data:', uploadData);
      
      // Check for url in response (API returns url not imageUrl)
      if (!uploadData || !uploadData.url) {
        throw new Error('No image URL returned from upload');
      }
      
      const imageUrl = uploadData.url;
      console.log('Uploaded image successfully. URL:', imageUrl);
      
      // Update user profile with the new image URL using server action
      try {
        const result = await updateUserProfile({
          image: imageUrl
        });
        
        // Server action completed successfully
        // Update session with new user data
        await updateSession({
          user: {
            ...session.user,
            image: imageUrl
          }
        });
        
        // Update timestamp to bust the cache
        setImageUpdateTimestamp(Date.now());
        
        // Sync metadata to ensure auth and database are in sync
        await refreshAvatar();
        
        // Reset state and show success message
        setValidationResult(null);
        setLastAttemptedFile(null);
        setRetryCount(0);
        toast.success('Profile photo updated successfully');
        
        // Force a complete page reload instead of a redirect
        // This ensures the browser fetches fresh data and the session is fully refreshed
        console.log('Forcing full page reload to refresh session...');
        setTimeout(() => {
          // Use replace() instead of href to prevent back button issues
          window.location.replace('/profile');
        }, 1500);
        
      } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in upload process:', error);
      setUploadError(error instanceof Error ? error.message : 'An unknown error occurred');
      
      // Increment retry count for the current file
      if (lastAttemptedFile === file) {
        setRetryCount(prev => prev + 1);
      } else {
        setRetryCount(1);
        setLastAttemptedFile(file);
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  // Compute button text based on state
  const getButtonText = () => {
    if (isUploading) return 'Uploading...';
    if (uploadError && retryCount > 0) return `Try Again (${retryCount})`;
    return 'Select Profile Photo';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/profile" className="mr-4 text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold">Update Profile Photo</h1>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Profile Photo</h2>
          
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
            
            {/* Upload area */}
            <div className="flex-1">
              <p className="text-gray-400 mb-4">
                Your profile photo will be visible to all users. Choose a clear photo that represents you.
              </p>
              
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileInputChange}
              />
              
              {/* Drop zone / click area */}
              <div
                className={`border-2 border-dashed ${isDragging ? 'border-amber-500 bg-amber-500/10' : 'border-gray-600 hover:border-gray-500'} rounded-lg p-6 mb-4 text-center cursor-pointer transition-colors`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleClick}
              >
                <div className="flex flex-col items-center justify-center">
                  <Upload className="w-12 h-12 text-gray-500 mb-3" />
                  <p className="text-gray-300 font-medium">
                    {isDragging ? 'Drop your image here' : 'Drag and drop your image here or click to browse'}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    JPG, PNG, WebP or GIF (Max 5MB)
                  </p>
                </div>
              </div>
              
              {/* Alternative button */}
              <button 
                className={`w-full py-3 px-4 rounded-lg flex items-center justify-center font-medium 
                  ${isUploading ? 'bg-amber-700 cursor-not-allowed' : uploadError ? 'bg-rose-700 hover:bg-rose-600' : 'bg-amber-600 hover:bg-amber-500'} 
                  transition-colors`}
                onClick={handleClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <span>{getButtonText()}</span>
                )}
              </button>
            </div>
          </div>
          
          {/* Validation message */}
          {validationResult && (
            <div className={`p-4 rounded-lg mb-4 ${validationResult.valid ? 'bg-green-700/20' : 'bg-rose-700/20 border border-rose-700'}`}>
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  {validationResult.valid ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-500" />
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium">
                    {validationResult.valid ? 'File is valid' : 'File validation failed'}
                  </h3>
                  {!validationResult.valid && (
                    <div className="mt-1 text-sm text-gray-300">
                      <ul className="list-disc pl-5 space-y-1">
                        {validationResult.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Error message */}
          {uploadError && !validationResult && (
            <div className="p-4 rounded-lg mb-4 bg-rose-700/20 border border-rose-700">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircle className="w-5 h-5 text-rose-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium">Upload failed</h3>
                  <div className="mt-1 text-sm text-gray-300">
                    {uploadError}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Guidelines */}
          <div className="border-t border-gray-700 pt-4 mt-6">
            <h3 className="font-medium mb-2">Guidelines for profile photos:</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-400 text-sm">
              <li>Choose a photo where your face is clearly visible</li>
              <li>Avoid group photos or photos with multiple people</li>
              <li>Use a high-quality image when possible</li>
              <li>Avoid using offensive or inappropriate images</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 