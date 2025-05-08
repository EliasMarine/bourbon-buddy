'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSupabaseSession, useSession } from '@/hooks/use-supabase-session';
import { redirect, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, MapPin, Briefcase, Calendar, Edit, Settings, Share2, Wine, Users, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getProfileImageUrl, getCoverPhotoUrl, getInitialLetter, DEFAULT_AVATAR_BG } from '@/lib/utils';
import SafeImage from '@/components/ui/SafeImage';

// No need for additional icon imports, using Lucide icons

// Extend the session user type to support coverPhoto
type UserWithCoverPhoto = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  coverPhoto?: string | null;
};

export default function ProfilePage() {
  const { data: session, status, update: updateSession, refreshAvatar } = useSession();
  const router = useRouter();
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
    if (!file || !session?.user) {
      toast.error('No file selected or user not logged in');
      return;
    }
    
    if (isUploading) {
      toast.error('An upload is already in progress');
      return;
    }
    
    setIsUploading(true);
    setUploadType(type);
    
    try {
      // Further validation
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File is too large. Maximum size is 5MB.');
      }
      
      if (!file.type.startsWith('image/')) {
        throw new Error('File is not an image. Please select an image file.');
      }
      
      // Create FormData for the file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('userId', session.user.id);
      
      // If we have a CSRF token in window global, add it to the request
      if (window._csrfToken) {
        formData.append('csrf_token', window._csrfToken);
      }
      
      // Add additional timestamp to prevent caching
      formData.append('_t', Date.now().toString());
      
      // Log what we're uploading (helpful for debugging)
      console.log(`Uploading ${type} image:`, {
        filename: file.name,
        size: file.size,
        type: file.type,
        timestamp: Date.now()
      });
      
      // Send the file to our API endpoint
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        let errorMessage = 'Failed to upload file';
        try {
          const errorData = await uploadResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse the response, use status text
          errorMessage = `${errorMessage}: ${uploadResponse.status} ${uploadResponse.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const uploadData = await uploadResponse.json();
      
      if (!uploadData.url) {
        throw new Error('No image URL returned from upload');
      }
      
      console.log(`Uploaded ${type} to: ${uploadData.url}`);
      
      // Now update the user profile with the new image
      const fieldToUpdate = type === 'profile' ? 'image' : 'coverPhoto';
      
      // Parse the URL to get a potentially shorter path-only version as fallback
      let originalUrl = uploadData.url;
      let shorterUrl = originalUrl;
      
      try {
        // Extract just the pathname which might be shorter
        const parsedUrl = new URL(originalUrl);
        shorterUrl = parsedUrl.pathname; // e.g., /storage/v1/object/public/...
        console.log('URL parsing for potential fallback:', {
          original: originalUrl.substring(0, 50) + '...',
          shorter: shorterUrl,
          originalLength: originalUrl.length,
          shorterLength: shorterUrl.length
        });
      } catch (e) {
        console.warn('Failed to parse URL for fallback:', e);
      }
      
      console.log(`Attempting to update user ${fieldToUpdate} with URL:`, {
        url: originalUrl.substring(0, 50) + '...',
        field: fieldToUpdate,
        hasCsrfToken: !!window._csrfToken,
        urlLength: originalUrl.length
      });
      
      // First try with the full URL
      try {
        // Process the update
        const updateResponse = await fetch('/api/user/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add CSRF token if available
            ...(window._csrfToken ? { 'x-csrf-token': window._csrfToken } : {})
          },
          body: JSON.stringify({ 
            [fieldToUpdate]: originalUrl 
          }),
          credentials: 'same-origin' // Include credentials for session authentication
        });

        if (!updateResponse.ok) {
          const status = updateResponse.status;
          console.warn(`Initial profile update failed with status ${status}, trying fallback with shorter URL...`);
          
          // If it's a 500 error and we have a shorter URL, try again with the shorter URL
          if (status === 500 && shorterUrl !== originalUrl) {
            // Try again with the shorter URL
            const fallbackResponse = await fetch('/api/user/profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(window._csrfToken ? { 'x-csrf-token': window._csrfToken } : {})
              },
              body: JSON.stringify({ 
                [fieldToUpdate]: shorterUrl 
              }),
              credentials: 'same-origin'
            });
            
            if (!fallbackResponse.ok) {
              let errorMessage = 'Failed to update profile (including fallback attempt)';
              let errorDetails = {};
              
              try {
                const errorData = await fallbackResponse.json();
                errorMessage = errorData.error || errorMessage;
                errorDetails = errorData;
                console.error('Fallback profile update also failed with details:', {
                  status: fallbackResponse.status,
                  statusText: fallbackResponse.statusText,
                  errorData,
                  shorterUrl: shorterUrl.substring(0, 50) + '...'
                });
              } catch (e) {
                // If we can't parse the response, use status text
                errorMessage = `${errorMessage}: ${fallbackResponse.status} ${fallbackResponse.statusText}`;
                console.error('Failed to parse fallback error response:', e);
              }
              
              throw new Error(errorMessage);
            }
            
            // Fallback was successful
            console.log('Fallback with shorter URL succeeded');
            const updateData = await fallbackResponse.json();
            
            // Update session with shorter URL
            await updateSessionAndUI(shorterUrl);
            return;
          } else {
            // Non-500 error or no shorter URL available
            let errorMessage = 'Failed to update profile';
            let errorDetails = {};
            
            try {
              const errorData = await updateResponse.json();
              errorMessage = errorData.error || errorMessage;
              errorDetails = errorData;
              console.error('Profile update failed with details:', {
                status: updateResponse.status,
                statusText: updateResponse.statusText,
                errorData,
                url: originalUrl.substring(0, 50) + '...'
              });
            } catch (e) {
              // If we can't parse the response, use status text
              errorMessage = `${errorMessage}: ${updateResponse.status} ${updateResponse.statusText}`;
              console.error('Failed to parse error response:', e);
            }
            
            throw new Error(errorMessage);
          }
        }

        console.log('Profile update successful, parsing response...');
        const updateData = await updateResponse.json();
        console.log('Profile update response:', updateData);
        
        // Update session with original URL
        await updateSessionAndUI(originalUrl);
        return;
      } catch (error) {
        console.error('Error during profile update:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(`Failed to update ${type === 'profile' ? 'profile' : 'cover'} photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadType(null);
    }
  };

  // Helper function to update session and UI
  const updateSessionAndUI = async (url: string) => {
    // Simplify session update to ensure it works
    if (uploadType === 'profile') {
      await updateSession({
        user: {
          ...session.user,
          image: url
        }
      });
    } else {
      // For cover photo, use a simpler approach 
      await updateSession({
        user: {
          ...session.user,
          coverPhoto: url
        }
      });
    }
    
    // Update timestamp to bust the cache only for the specific image that changed
    setImageUpdateTimestamp(Date.now());
    
    // Use refreshAvatar to ensure everything is in sync
    await refreshAvatar();
    
    toast.success(`${uploadType === 'profile' ? 'Profile' : 'Cover'} photo updated successfully`);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const files = event.target.files;
    
    if (!files || files.length === 0) {
      toast.error("No file selected");
      return;
    }
    
    const file = files[0];
    console.log(`File selected for ${type}:`, {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: new Date(file.lastModified).toISOString()
    });
    
    // Create a temporary blob URL to verify the file can be accessed
    try {
      const url = URL.createObjectURL(file);
      console.log(`Created blob URL for verification: ${url}`);
      // Clean up the URL after 1 second
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('Failed to create blob URL:', e);
      toast.error('Unable to access the selected file. Please try another image.');
      return;
    }
    
    // Reset the file input so we can select the same file again if needed
    event.target.value = '';
    
    // Process the file
    handleImageUpload(file, type);
  };

  const tabs = [
    { id: 'collection', label: 'Collection' },
    { id: 'activity', label: 'Activity' },
    { id: 'about', label: 'About' },
    { id: 'friends', label: 'Friends' },
  ];

  // Prepare profile image URL using memoization to prevent regeneration on each render
  const profileImageUrl = React.useMemo(() => {
    if (!session?.user?.image) return '';
    
    // Check if session user has hasAvatar flag set to true
    if (session.user.hasAvatar === false) {
      console.log('Profile page: hasAvatar flag is false, skipping image URL generation');
      return '';
    }
    
    // Check both image and avatar_url fields
    const imageUrl = session.user.avatar_url || session.user.image;
    if (!imageUrl) return '';
    
    // Only use timestamp for cache busting when the profile image was just updated
    const useTimestamp = imageUpdateTimestamp !== null;
    return getProfileImageUrl(imageUrl, useTimestamp);
  }, [session?.user?.image, session?.user?.avatar_url, session?.user?.hasAvatar, imageUpdateTimestamp]);
  
  const coverPhotoUrl = React.useMemo(() => {
    // Cast session.user to the extended type that includes coverPhoto
    const userWithCoverPhoto = session?.user as UserWithCoverPhoto;
    if (!userWithCoverPhoto?.coverPhoto) return '';
    // Only use timestamp for cache busting when the cover photo was just updated
    const useTimestamp = uploadType === 'cover' && imageUpdateTimestamp !== null;
    return getCoverPhotoUrl(userWithCoverPhoto.coverPhoto, useTimestamp);
  }, [session?.user, uploadType, imageUpdateTimestamp]);

  // Add getCsrfToken function if it doesn't exist
  const getCsrfToken = () => {
    return window._csrfToken || sessionStorage.getItem('csrfToken') || '';
  };

  // Add refreshSession function if it doesn't exist
  const refreshSession = async () => {
    // Update timestamp to force re-render of images
    setImageUpdateTimestamp(Date.now());
    
    try {
      // Use the existing refreshAvatar which correctly syncs metadata
      if (refreshAvatar) {
        await refreshAvatar();
      }
      
      // Force UI refresh using Next.js router
      router.refresh();
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }
  };

  const handleCoverPhotoChange = async (file: File | null) => {
    if (!file) {
      toast.error('No file selected');
      return;
    }
    
    if (isUploading) {
      toast.error('An upload is already in progress');
      return;
    }
    
    setIsUploading(true);
    setUploadType('cover');
    
    try {
      console.log(`Uploading cover image: ${JSON.stringify({
        filename: file.name,
        size: file.size,
        type: file.type,
        timestamp: Date.now()
      })}`);

      // Further validation
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File is too large. Maximum size is 5MB.');
      }
      
      if (!file.type.startsWith('image/')) {
        throw new Error('File is not an image. Please select an image file.');
      }
      
      // Create FormData for the file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'cover');
      formData.append('userId', session.user.id);
      formData.append('_t', Date.now().toString()); // Timestamp for cache busting
      
      // Upload the image file to the storage bucket first
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${uploadResponse.status}`);
      }
      
      const uploadData = await uploadResponse.json();
      
      if (!uploadData.url) {
        throw new Error('No image URL returned from upload');
      }
      
      // File was successfully uploaded to storage, now update the user profile
      const publicURL = uploadData.url;
      console.log(`Uploaded cover to: ${publicURL}`);

      // Try different approaches for the profile update - first use the path only if possible
      let pathOnlyUrl;
      try {
        const urlObj = new URL(publicURL);
        pathOnlyUrl = urlObj.pathname; // e.g., /storage/v1/object/public/...
        console.log(`Extracted path-only URL for profile update: ${pathOnlyUrl}`);
      } catch (e) {
        console.warn('Failed to parse URL, will use full URL:', e);
        pathOnlyUrl = publicURL;
      }
      
      // Get CSRF token
      const csrfToken = getCsrfToken();
      
      // Try with path-only URL first (typically shorter and meets RLS requirements)
      try {
        const response = await fetch('/api/user/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
          },
          body: JSON.stringify({ coverPhoto: pathOnlyUrl }),
          credentials: 'same-origin'
        });

        const data = await response.json();
        
        if (response.ok) {
          // Success with path-only URL
          await updateSessionAndUI(pathOnlyUrl);
          toast.success('Cover photo updated successfully');
          return;
        } else {
          // Log error but try again with full URL
          console.warn(`Path-only URL update failed (${response.status}): ${data.error || 'Unknown error'}`);
        }
      } catch (err) {
        console.warn('Error during path-only URL update:', err);
      }
      
      // If path-only URL failed, try with full URL
      try {
        const response = await fetch('/api/user/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
          },
          body: JSON.stringify({ coverPhoto: publicURL }),
          credentials: 'same-origin'
        });

        const data = await response.json();
        
        if (response.ok) {
          // Success with full URL
          await updateSessionAndUI(publicURL);
          toast.success('Cover photo updated successfully');
          return;
        } else {
          // All attempts failed, throw error
          throw new Error(data.error || data.details || `Profile update failed: ${response.status}`);
        }
      } catch (err) {
        console.error('Error during full URL update:', err);
        throw err;
      }
    } catch (err) {
      const error = err as Error;
      console.error(`Error updating cover photo:`, error);
      toast.error(`Failed to update cover photo: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={profileInputRef}
        className="hidden"
        accept="image/*"
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
            <button 
              className="absolute bottom-2 right-2 bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm transition-all disabled:opacity-50"
              onClick={() => profileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Camera size={20} className="text-white" />
              {isUploading && uploadType === 'profile' && (
                <span className="absolute inset-0 flex items-center justify-center bg-gray-900/60 rounded-full">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </span>
              )}
            </button>
          </div>

          {/* Profile Info */}
          <div className="flex-1 pt-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {session.user?.name || 'New User'}
                  <button 
                    className="ml-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white p-1 rounded inline-flex items-center"
                    title="Force sync profile data"
                    onClick={async () => {
                      try {
                        toast.loading('Syncing profile data...');
                        await fetch('/api/auth/sync-metadata', { 
                          method: 'GET',
                          cache: 'no-store'
                        });
                        await updateSession({ user: { ...session.user } });
                        toast.success('Profile data synced successfully');
                        // Force refresh the page
                        window.location.reload();
                      } catch (error) {
                        console.error('Error syncing profile data:', error);
                        toast.error('Failed to sync profile data');
                      }
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
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
    </div>
  );
} 