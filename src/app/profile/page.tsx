'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSupabaseSession, useSession } from '@/hooks/use-supabase-session';
import { redirect, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, MapPin, Briefcase, Calendar, Edit, Settings, Share2, Wine, Users, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getProfileImageUrl, getCoverPhotoUrl, getInitialLetter, DEFAULT_AVATAR_BG } from '@/lib/utils';
import SafeImage from '@/components/ui/SafeImage';
import { User } from '@supabase/supabase-js'; // Import User type

// No need for additional icon imports, using Lucide icons

// Define a more specific type for the session user
interface SessionUser extends User {
  user_metadata: {
    [key: string]: any; // Keep other metadata flexible
    coverPhoto?: string | null;
    avatar_url?: string | null; // Often used for profile image in metadata
    // name?: string | null; // Name can also be in metadata or top-level
  };
  // These might be custom additions by your useSession hook or app logic
  name?: string | null; // name is often part of user_metadata or a separate DB field
  image?: string | null; // image is often an alias for avatar_url from metadata
  hasAvatar?: boolean;
}

// Define the expected shape of the session state from useSession
interface SessionState {
  user: SessionUser | null;
  // Add other potential session properties if known, e.g., expires?: string;
}

// Helper function to truncate long URLs for logging
const truncateForLogging = (url: string) => {
  if (!url || url.length <= 50) return url;
  return url.substring(0, 25) + '...' + url.substring(url.length - 25);
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

  // Cast session.user to our more specific SessionUser type
  const currentUser = session?.user as SessionUser | undefined;

  // ADDED: useEffect to log changes to currentUser.user_metadata.coverPhoto
  useEffect(() => {
    console.log('[EFFECT_COVER_PHOTO_CHANGE] currentUser.user_metadata.coverPhoto:', currentUser?.user_metadata?.coverPhoto);
  }, [currentUser?.user_metadata?.coverPhoto]);

  // Log session updates
  // useEffect(() => {
  //   if (currentUser) {
  //     console.log('Session updated:', {
  //       profileImage: currentUser.image,
  //       coverPhoto: currentUser.user_metadata.coverPhoto
  //     });
  //   }
  // }, [currentUser]);

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
    if (!file || !currentUser) {
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
      formData.append('userId', currentUser.id);
      
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
      
      // Use the new updateProfileWithImage function for consistent error handling
      const success = await updateProfileWithImage(fieldToUpdate, uploadData.url);
      
      if (success) {
        // Update session with the image URL
        await updateSessionAndUI(uploadData.url);
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
    console.log('[UPDATE_SESSION_UI] Received URL:', url);
    console.log('[UPDATE_SESSION_UI] uploadType:', uploadType);
    console.log('[UPDATE_SESSION_UI] currentUser.user_metadata.coverPhoto BEFORE update:', currentUser?.user_metadata?.coverPhoto);

    if (uploadType === 'profile') {
      const newProfileMetadata = {
        ...currentUser?.user_metadata,
        avatar_url: url
      };
      console.log('[UPDATE_SESSION_UI] Intended new user_metadata for PROFILE:', newProfileMetadata);
      updateSession((prevSession: SessionState | null) => { 
        if (!prevSession?.user) return prevSession; 
        const typedUser = prevSession.user as SessionUser; 
        return {
          ...prevSession,
          user: {
            ...typedUser,
            image: url,
            user_metadata: newProfileMetadata
          }
        };
      });
    } else { // For cover photo
      const newCoverMetadata = {
        ...currentUser?.user_metadata,
        coverPhoto: url
      };
      console.log('[UPDATE_SESSION_UI] Intended new user_metadata for COVER:', newCoverMetadata);
      updateSession((prevSession: SessionState | null) => { 
        if (!prevSession?.user) return prevSession; 
        const typedUser = prevSession.user as SessionUser; 
        return {
          ...prevSession,
          user: {
            ...typedUser,
            user_metadata: newCoverMetadata
          }
        };
      });
    }

    setImageUpdateTimestamp(Date.now());

    try {
      // We are now relying on the functional update to updateSession for immediate client state,
      // and the USER_UPDATED event handled by useSession for eventual consistency from the server.
      // router.refresh() will re-fetch server components if needed.
      console.log('Relying on functional updateSession and router.refresh() for UI updates.');
      router.refresh();
      console.log('UI refresh requested after session update and timestamp change.');
    } catch (e) {
      console.error('Exception during UI refresh:', e);
    }
    
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
    if (!currentUser?.image && !currentUser?.user_metadata?.avatar_url) return '';
    
    // Check if session user has hasAvatar flag set to true
    if (currentUser?.hasAvatar === false) {
      console.log('Profile page: hasAvatar flag is false, skipping image URL generation');
      return '';
    }
    
    // Prefer avatar_url from metadata, fallback to image
    const imageUrl = currentUser?.user_metadata?.avatar_url || currentUser?.image;
    if (!imageUrl) return '';
    
    // Only use timestamp for cache busting when the profile image was just updated
    const useTimestamp = imageUpdateTimestamp !== null;
    return getProfileImageUrl(imageUrl, useTimestamp);
  }, [currentUser?.image, currentUser?.user_metadata?.avatar_url, currentUser?.hasAvatar, imageUpdateTimestamp]);
  
  const coverPhotoUrl = React.useMemo(() => {
    // Access coverPhoto from user_metadata of currentUser
    const coverPhotoFromMetadata = currentUser?.user_metadata?.coverPhoto;
    
    console.log('[MEMO_COVER_URL] Regenerating with currentUser.user_metadata.coverPhoto:', coverPhotoFromMetadata);
    console.log('[MEMO_COVER_URL] Regenerating coverPhotoUrl with data:', {
      hasCoverPhoto: !!coverPhotoFromMetadata,
      coverPhotoUrl: coverPhotoFromMetadata ? truncateForLogging(coverPhotoFromMetadata) : 'none',
      timestamp: imageUpdateTimestamp,
    });
    
    if (!coverPhotoFromMetadata) return '';
    
    const useTimestamp = imageUpdateTimestamp !== null; 
    return getCoverPhotoUrl(coverPhotoFromMetadata, useTimestamp);
  }, [currentUser?.user_metadata?.coverPhoto, imageUpdateTimestamp, truncateForLogging]);

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

    // Ensure currentUser is available before proceeding
    if (!currentUser) {
      toast.error('User session not found. Please log in again.');
      setIsUploading(false); // Reset uploading state if we bail early
      setUploadType(null);
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
      formData.append('userId', currentUser.id);
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
      const imageUrl = uploadData.url;
      console.log(`Uploaded cover to: ${imageUrl}`);
      
      // Use the new updateProfileWithImage function to handle the update
      const success = await updateProfileWithImage('coverPhoto', imageUrl);
      
      if (success) {
        toast.success('Cover photo updated successfully');
        
        // Update session and UI
        await updateSessionAndUI(imageUrl);
      }
      
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      toast.error(`Failed to update cover photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadType(null);
    }
  };

  const updateProfileWithImage = async (field: 'image' | 'coverPhoto', imageUrl: string) => {
    // Create map for error type logging
    const fieldNames = {
      'image': 'profile photo',
      'coverPhoto': 'cover photo'
    };
    
    try {
      console.log(`Attempting to update user ${field} with URL: ${JSON.stringify({
        url: truncateForLogging(imageUrl),
        field,
        hasCsrfToken: !!getCsrfToken(),
        urlLength: imageUrl.length
      })}`);
      
      // Get CSRF token for the request
      const token = getCsrfToken();
      
      if (!token) {
        console.error('No CSRF token available for profile update');
        toast.error(`Could not update ${fieldNames[field]} - security token missing`);
        return false;
      }
      
      // Always use POST method consistently - this is what our server API route is set up to handle
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": token
        },
        body: JSON.stringify({ [field]: imageUrl }),
        credentials: "include"
      });
      
      if (response.ok) {
        console.log(`Successfully updated ${field}`);
        
        // Parse the response to verify the URL was actually updated
        try {
          const responseData = await response.json();
          console.log(`Server response for ${field} update:`, responseData);
          
          // Verify the response contains the updated user with the new URL
          if (responseData?.user?.[field] === imageUrl) {
            console.log(`Server confirmed ${field} was updated to the new URL`);
          } else {
            console.warn(`Server response doesn't contain the expected ${field} value. Expected: ${truncateForLogging(imageUrl)}, Got: ${responseData?.user?.[field] ? truncateForLogging(responseData.user[field]) : 'undefined'}`);
          }
        } catch (parseError) {
          console.warn(`Could not parse server response for ${field} update:`, parseError);
        }
        
        return true;
      }
      
      // Handle error response
      const errorData = await response.json().catch(() => ({}));
      console.error(`Profile update failed with status ${response.status}`, errorData);
      
      // Extract the most user-friendly error message
      const errorMessage = 
        (errorData?.error) || 
        (errorData?.message) || 
        `Failed to update ${fieldNames[field]}. Please try again.`;
      
      toast.error(errorMessage);
      return false;
      
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${fieldNames[field]}. Please try again.`);
      return false;
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
            useTimestamp={uploadType === 'cover' && imageUpdateTimestamp !== null}
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
                alt={currentUser?.name || 'Profile'}
                fill
                className="object-cover"
                priority
                useTimestamp={false}
                fallback={
                  <div className={`w-full h-full flex items-center justify-center ${DEFAULT_AVATAR_BG} text-white text-4xl font-bold`}>
                    {getInitialLetter(currentUser?.name)}
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
                  {currentUser?.name || 'New User'}
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
                        await updateSession({ user: { ...currentUser } });
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