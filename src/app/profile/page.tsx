'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSupabaseSession, useSession } from '@/hooks/use-supabase-session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Camera, MapPin, Briefcase, Calendar, Edit, Settings, Share2, Wine, Users, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { getProfileImageUrl, getCoverPhotoUrl, getInitialLetter, DEFAULT_AVATAR_BG } from '@/lib/utils';
import SafeImage from '@/components/ui/SafeImage';
import { ensureStorageBucketExists } from '@/lib/supabase';
import { testFileValidation } from '@/lib/file-validation';

// Add global window type declaration
declare global {
  interface Window {
    _csrfToken?: string;
    testFileValidation?: typeof testFileValidation;
  }
}

// Extend the session user type to support coverPhoto
type UserWithCoverPhoto = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  coverPhoto?: string | null;
};

// Add testFileValidation to the window object for easy testing in console
if (typeof window !== 'undefined') {
  (window as any).testFileValidation = testFileValidation;
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const [activeTab, setActiveTab] = useState('collection');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'profile' | 'cover' | null>(null);
  const [imageUpdateTimestamp, setImageUpdateTimestamp] = useState<number | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Log session updates
  // useEffect(() => {
  //   if (session) {
  //     console.log('Session updated:', {
  //       profileImage: session.user?.image,
  //       coverPhoto: session.user?.coverPhoto
  //     });
  //   }
  // }, [session]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/login');
  }

  const handleImageUpload = async (file: File, type: 'profile' | 'cover') => {
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadType(type);
      
      // Ensure the storage bucket exists
      console.log('Ensuring storage bucket exists before upload');
      await ensureStorageBucketExists('bourbon-buddy-prod');
      
      // First, upload the file to get a URL
      const formData = new FormData();
      formData.append('file', file);
      
      // Get CSRF token from cookies or sessionStorage
      let csrfToken = '';
      try {
        // Check for global CSRF token first (from window._csrfToken)
        if (typeof window !== 'undefined' && window._csrfToken) {
          csrfToken = window._csrfToken;
        } else {
          // Try to get from sessionStorage
          csrfToken = sessionStorage.getItem('csrfToken') || '';
          
          // If not found, try to parse from cookie
          if (!csrfToken) {
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
              const [name, value] = cookie.trim().split('=');
              if (name === 'csrf_secret') {
                csrfToken = decodeURIComponent(value).split('|')[0];
                break;
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to get CSRF token:', e);
      }
      
      // Prepare headers with CSRF token if available
      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
      
      // Log debug info
      console.log('Uploading file with CSRF token:', csrfToken ? 'Present' : 'Missing');
      console.log('Upload type:', type);
      console.log('File size:', Math.round(file.size / 1024), 'KB');
      console.log('File type:', file.type);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed with status:', uploadResponse.status);
        console.error('Error response:', errorText);
        
        let errorMessage = 'Failed to upload image';
        let detailedError = '';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
          
          // Get detailed error info if available
          if (errorData.details) {
            detailedError = `Technical details: ${JSON.stringify(errorData.details)}`;
            console.error('Detailed error information:', errorData.details);
          }
        } catch (e) {
          // Fallback to text if not valid JSON
          console.error('Error parsing error response:', e);
        }
        
        // Show friendly message to the user
        const userMessage = type === 'profile' 
          ? 'Profile picture upload failed. Please try using a different PNG image file.' 
          : 'Cover photo upload failed. Please try using a different image file.';
        
        throw new Error(`${userMessage} (${errorMessage})`);
      }

      const uploadData = await uploadResponse.json();
      const imageUrl = uploadData.url;
      
      console.log('File uploaded successfully, URL:', imageUrl);

      // Now update the user profile with the new image URL
      const updateData = {
        ...(type === 'profile' ? { image: imageUrl } : { coverPhoto: imageUrl })
      };
      
      console.log('Updating user profile with:', updateData);
      
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const { user } = await response.json();
      console.log('Profile updated successfully:', user);
      
      // Force a session update with the new user data but only update what changed
      // to prevent unnecessary rerenders
      const updateSessionData = {
        user: {
          ...session.user,
        }
      };

      // Add the updated field based on type
      if (type === 'profile') {
        updateSessionData.user.image = imageUrl;
      } else {
        // Handle coverPhoto by using type assertion
        (updateSessionData.user as any).coverPhoto = imageUrl;
      }
      
      console.log('Updating session with:', updateSessionData);
      await updateSession(updateSessionData);
      
      // Update timestamp to bust the cache only for the specific image that changed
      setImageUpdateTimestamp(Date.now());
      
      toast.success(`${type === 'profile' ? 'Profile' : 'Cover'} photo updated successfully`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(`Failed to update ${type === 'profile' ? 'profile' : 'cover'} photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadType(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    console.log(`File selected for ${type}:`, {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: new Date(file.lastModified).toISOString()
    });
    
    // Process file based on its extension and MIME type
    let processedFile = file;
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Ensure the correct MIME type for common image formats
    if (fileExt === 'png' && file.type !== 'image/png') {
      console.log(`Fixing MIME type for PNG file: ${file.name} - current type: ${file.type}`);
      processedFile = new File([file], file.name, { type: 'image/png' });
      console.log('Created new File object with corrected MIME type: image/png');
    } else if ((fileExt === 'jpg' || fileExt === 'jpeg') && file.type !== 'image/jpeg') {
      console.log(`Fixing MIME type for JPEG file: ${file.name} - current type: ${file.type}`);
      processedFile = new File([file], file.name, { type: 'image/jpeg' });
      console.log('Created new File object with corrected MIME type: image/jpeg');
    } else if (fileExt === 'gif' && file.type !== 'image/gif') {
      console.log(`Fixing MIME type for GIF file: ${file.name} - current type: ${file.type}`);
      processedFile = new File([file], file.name, { type: 'image/gif' });
      console.log('Created new File object with corrected MIME type: image/gif');
    } else if (fileExt === 'webp' && file.type !== 'image/webp') {
      console.log(`Fixing MIME type for WebP file: ${file.name} - current type: ${file.type}`);
      processedFile = new File([file], file.name, { type: 'image/webp' });
      console.log('Created new File object with corrected MIME type: image/webp');
    }
    
    // Read the file header to verify the format (for debug purposes)
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const arr = new Uint8Array(e.target.result as ArrayBuffer);
        const header = Array.from(arr.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
        console.log(`File header: ${header}`);
        
        // Validate common image signatures
        let format = '';
        // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
        if (arr.length >= 8 &&
            arr[0] === 0x89 &&
            arr[1] === 0x50 &&
            arr[2] === 0x4E &&
            arr[3] === 0x47 &&
            arr[4] === 0x0D &&
            arr[5] === 0x0A &&
            arr[6] === 0x1A &&
            arr[7] === 0x0A) {
          format = 'PNG';
        }
        // Check JPEG signature: FF D8 FF
        else if (arr.length >= 3 &&
                arr[0] === 0xFF &&
                arr[1] === 0xD8 &&
                arr[2] === 0xFF) {
          format = 'JPEG';
        }
        // Check GIF signatures: GIF87a or GIF89a
        else if (arr.length >= 6 &&
                arr[0] === 0x47 && // G
                arr[1] === 0x49 && // I
                arr[2] === 0x46 && // F
                arr[3] === 0x38 && // 8
                (arr[4] === 0x37 || arr[4] === 0x39) && // 7 or 9
                arr[5] === 0x61) { // a
          format = 'GIF';
        }
        // Check WebP signature (RIFF....WEBP)
        else if (arr.length >= 12 &&
                arr[0] === 0x52 && // R
                arr[1] === 0x49 && // I
                arr[2] === 0x46 && // F
                arr[3] === 0x46 && // F
                arr[8] === 0x57 && // W
                arr[9] === 0x45 && // E
                arr[10] === 0x42 && // B
                arr[11] === 0x50) { // P
          format = 'WebP';
        }
        
        console.log(`Detected file format from header: ${format || 'Unknown'}`);
        
        // Final verification for PNG format specifically
        if (fileExt === 'png') {
          const isPngSignature = arr.length >= 8 &&
                         arr[0] === 0x89 &&
                         arr[1] === 0x50 &&
                         arr[2] === 0x4E &&
                         arr[3] === 0x47 &&
                         arr[4] === 0x0D &&
                         arr[5] === 0x0A &&
                         arr[6] === 0x1A &&
                         arr[7] === 0x0A;
                         
          console.log(`PNG validation result: ${isPngSignature ? 'Valid PNG signature' : 'INVALID PNG SIGNATURE'}`);
          
          // If file extension is PNG but no PNG signature, warn user
          if (!isPngSignature) {
            console.warn(`⚠️ File has .png extension but lacks PNG signature. Upload may fail.`);
          }
        }
      }
    };
    reader.readAsArrayBuffer(processedFile.slice(0, 16));
    
    // Upload the processed file
    handleImageUpload(processedFile, type);
  };

  const tabs = [
    { id: 'collection', label: 'Collection' },
    { id: 'activity', label: 'Activity' },
    { id: 'about', label: 'About' },
    { id: 'friends', label: 'Friends' },
  ];

  // Prepare profile and cover image URLs using memoization to prevent regeneration on each render
  const profileImageUrl = React.useMemo(() => {
    if (!session?.user?.image) return '';
    // Only use timestamp for cache busting when the profile image was just updated
    const useTimestamp = uploadType === 'profile' && imageUpdateTimestamp !== null;
    return getProfileImageUrl(session.user.image, useTimestamp);
  }, [session?.user?.image, uploadType, imageUpdateTimestamp]);
  
  const coverPhotoUrl = React.useMemo(() => {
    // Cast session.user to the extended type that includes coverPhoto
    const userWithCoverPhoto = session?.user as UserWithCoverPhoto;
    if (!userWithCoverPhoto?.coverPhoto) return '';
    // Only use timestamp for cache busting when the cover photo was just updated
    const useTimestamp = uploadType === 'cover' && imageUpdateTimestamp !== null;
    return getCoverPhotoUrl(userWithCoverPhoto.coverPhoto, useTimestamp);
  }, [session?.user, uploadType, imageUpdateTimestamp]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={profileInputRef}
        className="hidden"
        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
        onChange={(e) => handleFileChange(e, 'profile')}
      />
      <input
        type="file"
        ref={coverInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => handleFileChange(e, 'cover')}
      />

      {/* Cover Photo Section */}
      <div className="relative h-[300px] md:h-[400px]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/90">
          <SafeImage
            src={coverPhotoUrl}
            alt="Cover"
            fill
            className="object-cover"
            priority
            useTimestamp={false}
            fallbackClassName="bg-gray-800"
          />
        </div>
        <button 
          className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2 transition-all disabled:opacity-50"
          onClick={() => coverInputRef.current?.click()}
          disabled={isUploading}
        >
          <Camera size={18} />
          <span>{isUploading && uploadType === 'cover' ? 'Uploading...' : 'Edit Cover Photo'}</span>
        </button>
      </div>

      {/* Profile Section */}
      <div className="container mx-auto px-4 -mt-[100px] relative z-10">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Profile Picture */}
          <div className="relative">
            <div className="w-[168px] h-[168px] rounded-full border-4 border-gray-900 overflow-hidden relative bg-gray-800">
              <SafeImage
                src={profileImageUrl}
                alt={session.user?.name || 'Profile'}
                fill
                className="object-cover"
                priority
                useTimestamp={false}
                fallback={
                  <div className={`w-full h-full flex items-center justify-center ${DEFAULT_AVATAR_BG} text-white text-4xl font-bold`}>
                    {getInitialLetter(session.user?.name)}
                  </div>
                }
              />
            </div>
            <div className="flex items-center gap-2 absolute bottom-2 right-2">
              <button 
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm transition-all disabled:opacity-50"
                onClick={() => profileInputRef.current?.click()}
                disabled={isUploading}
                title="Quick upload"
              >
                <Camera size={20} className="text-white" />
                {isUploading && uploadType === 'profile' && (
                  <span className="absolute inset-0 flex items-center justify-center bg-gray-900/60 rounded-full">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </span>
                )}
              </button>
              <Link
                href="/profile/photo"
                className="bg-amber-600 hover:bg-amber-700 p-2 rounded-full backdrop-blur-sm transition-all"
                title="Advanced photo upload with validation"
              >
                <Upload size={20} className="text-white" />
              </Link>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 pt-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {session.user?.name}
                </h1>
                <div className="flex items-center gap-4 text-gray-300">
                  <div className="flex items-center gap-1">
                    <Wine size={16} />
                    <span>120 Spirits</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    <span>250 Friends</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/profile/edit" className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Edit size={18} />
                  <span>Edit Profile</span>
                </Link>
                <button className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Settings size={18} />
                  <span>Settings</span>
                </button>
                <button className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Share2 size={18} />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Bio Section */}
            <div className="mt-6 bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-300">
                    <MapPin size={18} className="text-amber-500" />
                    <span>Louisville, Kentucky</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <Briefcase size={18} className="text-amber-500" />
                    <span>Master Distiller at Heaven Hill</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-300">
                    <Calendar size={18} className="text-amber-500" />
                    <span>Joined March 2024</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 border-b border-gray-800">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-6 py-4 font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-amber-500'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="py-8">
          {activeTab === 'collection' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Collection items will go here */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-amber-500/50 transition-all">
                <h3 className="text-xl font-semibold text-white mb-4">Collection coming soon...</h3>
                <p className="text-gray-400">Your spirit collection will be displayed here.</p>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              {/* Activity feed will go here */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Activity feed coming soon...</h3>
                <p className="text-gray-400">Your recent activity will be displayed here.</p>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="max-w-2xl">
              {/* About section will go here */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">About section coming soon...</h3>
                <p className="text-gray-400">Your detailed information will be displayed here.</p>
              </div>
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Friends list will go here */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Friends list coming soon...</h3>
                <p className="text-gray-400">Your friends will be displayed here.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add a debug section to the profile page layout with a button to run tests
      // This will be hidden in production */}

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-6 bg-slate-800 rounded-xl border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4">Developer Tools</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-md font-medium text-white mb-2">File Validation Test</h4>
              <button
                type="button"
                onClick={async () => {
                  console.log("Running file validation tests...");
                  const results = await testFileValidation();
                  toast.success(`Tests completed: ${results.passed.length} passed, ${results.failed.length} failed`);
                }}
                className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg"
              >
                Run File Validation Tests
              </button>
              <p className="text-gray-400 text-sm mt-2">
                Run tests for file type validation. Results appear in browser console.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 