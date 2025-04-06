'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Spirit } from '@/types';
import { Wine, ArrowLeft, Building2, Award, Droplets, Star, Tag, ExternalLink, Share2, Copy, Check, Search, Edit, X, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ModernBottleLevelIndicator from '@/components/ui/ModernBottleLevelIndicator';
import Image from 'next/image';

interface WebData {
  query: string;
  results: {
    title: string;
    description: string;
    source: string;
    url: string;
  }[];
  relatedInfo: {
    distillery: {
      name: string;
      location: string;
      founded: string;
      description: string;
    };
    product: {
      avgRating: string;
      price: {
        low: number;
        avg: number;
        high: number;
      };
      awards: string[];
      releaseYear?: string;
    };
    tastingNotes: {
      expert: {
        aroma: string;
        taste: string;
        finish: string;
      };
      community: string[];
    };
  };
}

interface ApiResponse {
  spirit: Spirit;
  webData: WebData | null;
  webError?: string;
}

// Add a new interface for Google Image search results
interface GoogleImageResult {
  url: string;
  alt: string;
  source: string;
}

interface GoogleImageSearchResponse {
  images: GoogleImageResult[];
  query: string;
}

export default function SpiritDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [webData, setWebData] = useState<WebData | null>(null);
  const [isWebSearchLoading, setIsWebSearchLoading] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<{
    nose: string[];
    palate: string[];
    finish: string[];
  }>({
    nose: [],
    palate: [],
    finish: []
  });
  const [isImageSearchLoading, setIsImageSearchLoading] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState<GoogleImageResult[]>([]);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const spiritId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'loading') return;
    
    // Fetch spirit details when session is available
    fetchSpiritDetails();
  }, [session, status, router, spiritId]);

  useEffect(() => {
    // Generate the share URL
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/collection/spirit/${params.id}`);
    }
  }, [params.id]);

  useEffect(() => {
    // Automatically fetch web data when spirit details are loaded
    if (data?.spirit && !data.webData && !isWebSearchLoading) {
      fetchSpiritInfo();
    }
  }, [data]);

  useEffect(() => {
    // Parse tasting notes when spirit data is available
    if (data?.spirit) {
      const parseNotes = (notesStr: string | undefined | null) => {
        if (!notesStr) return [];
        
        try {
          // First try to parse as JSON (for notes stored as arrays)
          const parsed = JSON.parse(notesStr);
          // Ensure the result is an array
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          console.log(`Parsing notes as comma-separated values: "${notesStr}"`);
          // If JSON parsing fails, split by comma (for notes stored as comma-separated strings)
          return notesStr.split(',').map(n => n.trim()).filter(Boolean);
        }
      };
      
      console.log('Original nose data:', data.spirit.nose);
      console.log('Original palate data:', data.spirit.palate);
      console.log('Original finish data:', data.spirit.finish);
      
      const parsedNotes = {
        nose: parseNotes(data.spirit.nose),
        palate: parseNotes(data.spirit.palate),
        finish: parseNotes(data.spirit.finish)
      };
      
      console.log('Parsed notes:', parsedNotes);
      setSelectedNotes(parsedNotes);
    }
  }, [data?.spirit]);

  const fetchSpiritDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/spirit/${spiritId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch spirit details');
      }
      
      const data = await response.json();
      setData(data);
      
      // If webData is already included from the API, set it directly
      if (data.webData) {
        setWebData(data.webData);
      }
    } catch (error) {
      console.error('Error fetching spirit details:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      toast('Failed to load spirit details', { icon: '❌' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSpiritInfo = async () => {
    if (!data?.spirit) return;
    
    setIsWebSearchLoading(true);
    try {
      // Create a more specific query that includes all relevant spirit details
      const spiritInfo = data.spirit;
      
      // Use brand name as the primary identifier for the distillery
      // This should match better with the predefined distilleries in the API
      let distillery = spiritInfo.brand || '';
      
      // Extract potential release year from name or description
      let releaseYear = '';
      const yearPattern = /\b(19\d{2}|20\d{2})\b/; // Match years from 1900-2099
      
      // Check the name for the year first
      const nameYearMatch = spiritInfo.name?.match(yearPattern);
      if (nameYearMatch && nameYearMatch[1]) {
        releaseYear = nameYearMatch[1];
      }
      // If not found in name, check description
      else if (spiritInfo.description) {
        const descYearMatch = spiritInfo.description.match(yearPattern);
        if (descYearMatch && descYearMatch[1]) {
          releaseYear = descYearMatch[1];
        }
      }
      
      // Build search query with most specific information first
      const queryParts = [];
      
      // Add brand (distillery) if available
      if (spiritInfo.brand && spiritInfo.brand.trim() !== '') {
        queryParts.push(spiritInfo.brand.trim());
      }
      
      // Add name if available
      if (spiritInfo.name && spiritInfo.name.trim() !== '') {
        queryParts.push(spiritInfo.name.trim());
      }
      
      // Add type if available with proper formatting
      if (spiritInfo.type) {
        const type = spiritInfo.type.trim().toLowerCase();
        
        if (type === 'bourbon') {
          queryParts.push('bourbon whiskey');
        } else if (type === 'scotch') {
          // Check if single malt is mentioned in description
          const isSingleMalt = spiritInfo.description?.toLowerCase().includes('single malt');
          if (isSingleMalt) {
            queryParts.push('single malt scotch whisky');
          } else {
            queryParts.push('scotch whisky');
          }
        } else {
          // Add the type as is
          queryParts.push(type);
        }
      }
      
      // Add age statement if found in name
      const ageRegex = /(\d+)\s*(?:year|yr)s?\s*(?:old)?/i;
      const ageMatch = spiritInfo.name?.match(ageRegex) || spiritInfo.description?.match(ageRegex);
      if (ageMatch && ageMatch[1]) {
        queryParts.push(`${ageMatch[1]} year`);
      }
      
      // Filter out empty strings and join with spaces
      const query = queryParts.filter(Boolean).join(' ');
      console.log(`Searching for specific bottle info: "${query}" with distillery: "${distillery}", releaseYear: "${releaseYear}"`);
      
      // Construct search URL with all parameters
      const searchUrl = `/api/web-search?query=${encodeURIComponent(query)}&distillery=${encodeURIComponent(distillery)}&releaseYear=${encodeURIComponent(releaseYear)}`;
      console.log('Search URL:', searchUrl);
      
      // Make the request
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from web-search API:', errorText);
        throw new Error(`Failed to fetch spirit information: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Web search data received:', responseData);
      
      if (responseData && responseData.relatedInfo) {
        setWebData(responseData);
        toast.success('Spirit information loaded');
      } else {
        throw new Error('Received incomplete data from web search');
      }
    } catch (error) {
      console.error('Error fetching spirit info:', error);
      toast.error('Failed to load spirit information');
    } finally {
      setIsWebSearchLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: data?.spirit.name || 'Spirit Details',
        text: `Check out ${data?.spirit.brand} ${data?.spirit.name} in my bourbon collection!`,
        url: url,
      }).catch((error) => {
        console.error('Error sharing', error);
        // Fall back to copy method if sharing fails
        copyToClipboard(url);
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      toast('Link copied to clipboard', { icon: '✅' });
      setTimeout(() => setIsCopied(false), 3000);
    }, (err) => {
      console.error('Failed to copy: ', err);
      toast('Failed to copy link', { icon: '❌' });
    });
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/collection/${params.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Spirit removed from collection');
        router.push('/collection');
      } else {
        console.error('Failed to delete spirit:', data.error);
        toast.error('Failed to remove spirit');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error deleting spirit:', error);
      toast.error('Failed to remove spirit');
      setIsLoading(false);
    }
  };

  const handleRatingChange = async (newRating: number, e?: React.MouseEvent) => {
    // Prevent default button behavior which might cause page refresh
    e?.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Clean up the spirit data for updating
      const { 
        id, 
        createdAt, 
        updatedAt, 
        ownerId, 
        owner,
        ...cleanSpirit 
      } = data?.spirit as any;
      
      const updateData = {
        ...cleanSpirit,
        rating: newRating
      };
      
      console.log('Updating rating with data:', updateData);
      
      const response = await fetch(`/api/collection/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update rating');
      }
      
      const updatedSpirit = await response.json();
      setData(data ? {
        spirit: updatedSpirit,
        webData: data.webData,
        webError: data.webError
      } : null);
      toast.success('Rating updated');
    } catch (error) {
      console.error('Error updating rating:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update rating');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveNote = async (category: 'nose' | 'palate' | 'finish', noteToRemove: string, e?: React.MouseEvent) => {
    // Prevent default event behavior
    e?.preventDefault();
    
    // Remove the note from selectedNotes
    const updatedNotes = {
      ...selectedNotes,
      [category]: selectedNotes[category].filter(note => note !== noteToRemove)
    };
    
    setSelectedNotes(updatedNotes);
    
    try {
      // Clean up the spirit data for updating
      const { 
        id, 
        createdAt, 
        updatedAt, 
        ownerId, 
        owner,
        ...cleanSpirit 
      } = data?.spirit as any;
      
      const updateData = {
        ...cleanSpirit,
        [category]: JSON.stringify(updatedNotes[category])
      };
      
      const response = await fetch(`/api/collection/${spiritId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        // Restore previous state if update fails
        setSelectedNotes(selectedNotes);
        toast.error('Failed to update tasting notes');
        return;
      }
      
      toast.success('Tasting note removed');
      
    } catch (error) {
      console.error('Error updating tasting notes:', error);
      // Restore previous state if update fails
      setSelectedNotes(selectedNotes);
      toast.error('Failed to update tasting notes');
    }
  };

  // Add a new function to search for bottle images using Google
  const searchBottleImages = async () => {
    if (!data?.spirit) return;
    
    setIsImageSearchLoading(true);
    setImageSearchResults([]);
    setShowImageOptions(false);
    
    try {
      const spiritInfo = data.spirit;
      const queryParams = new URLSearchParams();
      
      // Build more precise search parameters
      if (spiritInfo.name) queryParams.append('name', spiritInfo.name.trim());
      if (spiritInfo.brand) queryParams.append('brand', spiritInfo.brand.trim());
      if (spiritInfo.type) queryParams.append('type', spiritInfo.type.trim());
      
      // Extract year from name or description if available
      const yearPattern = /\b(19\d{2}|20\d{2})\b/;
      let releaseYear = '';
      
      // Check name first
      const nameYearMatch = spiritInfo.name.match(yearPattern);
      if (nameYearMatch && nameYearMatch[1]) {
        releaseYear = nameYearMatch[1];
      } 
      // Then check description
      else if (spiritInfo.description) {
        const descYearMatch = spiritInfo.description.match(yearPattern);
        if (descYearMatch && descYearMatch[1]) {
          releaseYear = descYearMatch[1];
        }
      }
      
      if (releaseYear) queryParams.append('year', releaseYear);
      
      // Add a cache-busting random parameter to ensure fresh results
      queryParams.append('_cb', Date.now().toString());
      
      // Log what we're searching for
      console.log(`Searching for bottle images with params:`, Object.fromEntries(queryParams.entries()));
      
      const apiUrl = `/api/spirits/google-image-search?${queryParams.toString()}`;
      console.log(`[Client] Requesting image search URL: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Image search error response:', errorText);
        throw new Error(`Failed to fetch bottle images: ${response.status} ${response.statusText}`);
      }
      
      const searchResponse: GoogleImageSearchResponse = await response.json();
      console.log(`Received ${searchResponse.images?.length || 0} image results for query: ${searchResponse.query}`);
      
      if (searchResponse.images && searchResponse.images.length > 0) {
        // Filter out any invalid URLs before setting state
        const validImages = searchResponse.images.filter(img => {
          try {
            new URL(img.url);
            return true;
          } catch {
            console.warn(`Invalid image URL: ${img.url}`);
            return false;
          }
        });
        
        if (validImages.length > 0) {
          setImageSearchResults(validImages);
          setShowImageOptions(true);
          toast.success(`Found ${validImages.length} potential bottle images`);
        } else {
          toast.error('No valid bottle images found');
        }
      } else {
        toast.error('No bottle images found');
      }
    } catch (error) {
      console.error('Error searching for bottle images:', error);
      toast.error('Failed to search for bottle images');
      
      // Fallback to direct browser image search if API fails
      if (data?.spirit) {
        const spirit = data.spirit;
        const searchQuery = `${spirit.brand || ''} ${spirit.name || ''} ${spirit.type || ''} bottle`;
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`;
        
        // Ask user if they want to search directly
        if (confirm('Image search failed. Would you like to search for images in your browser?')) {
          window.open(googleUrl, '_blank');
        }
      }
    } finally {
      setIsImageSearchLoading(false);
    }
  };
  
  // Add a function to update the spirit with the selected image
  const updateBottleImage = async (imageUrl: string) => {
    if (!data?.spirit) return;
    
    try {
      setIsLoading(true);
      
      // Validate the URL first
      try {
        new URL(imageUrl);
      } catch (e) {
        throw new Error('Invalid image URL selected');
      }
      
      // Check if the image is accessible
      try {
        const imageCheck = await fetch(imageUrl, { method: 'HEAD' });
        if (!imageCheck.ok) {
          throw new Error(`Image not accessible (status: ${imageCheck.status})`);
        }
      } catch (error) {
        console.warn('Image accessibility check failed:', error);
        // Continue anyway - some servers block HEAD requests but allow GET
      }
      
      // Clean up the spirit data for updating
      const { 
        id, 
        createdAt, 
        updatedAt, 
        ownerId, 
        owner,
        ...cleanSpirit 
      } = data.spirit as any;
      
      // Add a cachebuster to the image URL if it doesn't already have one
      let finalImageUrl = imageUrl;
      if (!imageUrl.includes('?')) {
        finalImageUrl = `${imageUrl}?_cb=${Date.now()}`;
      } else if (!imageUrl.includes('_cb=')) {
        finalImageUrl = `${imageUrl}&_cb=${Date.now()}`;
      }
      
      const updateData = {
        ...cleanSpirit,
        imageUrl: finalImageUrl
      };
      
      console.log('Updating spirit with image URL:', finalImageUrl);
      
      const response = await fetch(`/api/collection/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update bottle image');
      }
      
      const updatedSpirit = await response.json();
      
      // Update the local state
      setData(data ? {
        spirit: updatedSpirit,
        webData: data.webData,
        webError: data.webError
      } : null);
      
      setSelectedImageUrl(null);
      setShowImageOptions(false);
      toast.success('Bottle image updated');
      
      // Force reload the image element to prevent caching issues
      setTimeout(() => {
        const bottleImage = document.querySelector('.spirit-bottle-image') as HTMLImageElement;
        if (bottleImage) {
          bottleImage.src = finalImageUrl;
        } else {
          // If the element can't be found, reload the page
          window.location.reload();
        }
      }, 500);
    } catch (error) {
      console.error('Error updating bottle image:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update bottle image');
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to force-reload the page to get fresh data
  const forceRefresh = () => {
    // Clear any cache in memory
    if (typeof caches !== 'undefined') {
      // Try to clear all relevant caches
      const cachesToClear = ['image-cache', 'data-cache', 'api-cache'];
      Promise.all(
        cachesToClear.map(cacheName => 
          caches.delete(cacheName).catch(e => console.error(`Error clearing ${cacheName}:`, e))
        )
      ).catch(e => console.error('Error clearing caches:', e));
    }
    
    // Reload page with cache-busting parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('_refresh', Date.now().toString());
      window.location.href = url.toString();
    }
  };

  if (status === 'loading' || isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-t-2 border-amber-500 border-solid rounded-full animate-spin"></div>
    </div>;
  }

  if (error || !data) {
    return <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-red-500 mb-4">{error || 'Failed to load spirit details'}</div>
      <Link href="/collection" className="flex items-center text-amber-500 hover:underline">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Collection
      </Link>
    </div>;
  }

  const { spirit } = data;
  const rating = spirit.rating ? Number(spirit.rating) : 0;
  const displayRating = Math.round(rating * 10) / 10; // Round to 1 decimal place
  
  return (
    <div className="min-h-screen relative">
      {/* Background image with overlay */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10"></div>
        <div className="absolute inset-0 overflow-hidden">
          <Image 
            src="/images/backgrounds/Collection background/collection_background.jpg?v=1"
            alt="Collection background"
            fill
            priority
            className="object-cover"
          />
        </div>
      </div>
      
      {/* Noise texture overlay */}
      <div className="fixed inset-0 opacity-20 mix-blend-overlay pointer-events-none z-10" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
      ></div>

      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 py-12 pt-24">
        {/* Navigation and Actions */}
        <div className="flex justify-between items-center mb-6">
          <Link href="/collection" className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md transition-colors text-base font-medium shadow-lg">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Collection
          </Link>
          
          <div className="flex space-x-3">
            <Link 
              href={`/collection/spirit/${spirit.id}/edit`}
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors shadow-md"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md transition-colors shadow-md"
            >
              Remove
            </button>
          </div>
        </div>

        {/* Spirit Header */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 mb-8">
          <div className="md:flex">
            {/* Image Column - More flexible approach */}
            <div className="md:w-1/3 bg-white relative flex flex-col">
              {spirit.imageUrl ? (
                <div className="flex items-center justify-center py-6 px-4 h-full min-h-[300px] md:min-h-[400px]">
                  <div className="relative flex items-center justify-center">
                    <img
                      src={spirit.imageUrl}
                      alt={spirit.name}
                      className="max-w-[95%] max-h-[90%] object-contain spirit-bottle-image transition-transform hover:scale-[1.02]"
                      style={{ maxHeight: "min(70vh, 600px)" }} 
                      loading="eager"
                      onError={(e) => {
                        // Fallback if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite error loop
                        target.src = '/images/bottle-placeholder.png'; // Fallback image
                      }}
                    />
                  </div>
                  <button
                    onClick={searchBottleImages}
                    disabled={isImageSearchLoading}
                    className="absolute bottom-4 right-4 p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg transition-colors z-10"
                    title="Update bottle image"
                  >
                    {isImageSearchLoading ? (
                      <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin" />
                    ) : (
                      <ImageIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="w-full h-64 md:h-full bg-gray-800 flex flex-col items-center justify-center p-6">
                  <span className="text-gray-500 mb-3">No image</span>
                  <button
                    onClick={searchBottleImages}
                    disabled={isImageSearchLoading}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors flex items-center gap-2"
                  >
                    {isImageSearchLoading ? (
                      <div className="w-4 h-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2" />
                    ) : (
                      <Search className="w-4 h-4 mr-1" />
                    )}
                    Find Bottle Image
                  </button>
                </div>
              )}
              
              {/* Image Search Results Modal */}
              {showImageOptions && imageSearchResults.length > 0 && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-gray-800 rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-white">Select Bottle Image</h2>
                      <button 
                        onClick={() => setShowImageOptions(false)}
                        className="p-1 hover:bg-gray-700 rounded-full"
                      >
                        <X className="w-6 h-6 text-gray-400 hover:text-white" />
                      </button>
                    </div>
                    
                    <p className="text-gray-300 mb-2">
                      Found {imageSearchResults.length} potential images for {spirit.brand} {spirit.name}.
                    </p>
                    <p className="text-gray-400 text-sm mb-4">
                      Select the image that best represents this bottle in your collection.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {imageSearchResults.map((image, index) => (
                        <div 
                          key={index}
                          className={`relative rounded-lg overflow-hidden border-2 hover:border-amber-500 cursor-pointer transition-all ${
                            selectedImageUrl === image.url ? 'border-amber-500 shadow-lg shadow-amber-500/30 scale-[1.02]' : 'border-transparent'
                          }`}
                          onClick={() => {
                            setSelectedImageUrl(image.url);
                            setSelectedImageIndex(index);
                            setPreviewUrl(image.url);
                          }}
                        >
                          <div className="aspect-[3/4] bg-white relative">
                            {/* Loading spinner */}
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-white/60 z-0">
                              <div className="w-8 h-8 border-t-2 border-b-2 border-gray-400 rounded-full animate-spin"></div>
                            </div>
                            
                            {/* Image container */}
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                              <img 
                                src={image.url} 
                                alt={image.alt}
                                className="max-w-[90%] max-h-[90%] object-contain"
                                loading="lazy"
                                onLoad={(e) => {
                                  // Hide spinner when image loads
                                  const target = e.target as HTMLImageElement;
                                  const parent = target.closest('.aspect-\\[3\\/4\\]');
                                  if (parent) {
                                    const spinner = parent.querySelector('.bg-white\\/60');
                                    if (spinner) {
                                      spinner.classList.add('hidden');
                                    }
                                  }
                                }}
                                onError={(e) => {
                                  // Handle broken images with a fallback message
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.closest('.aspect-\\[3\\/4\\]');
                                  if (parent) {
                                    const spinner = parent.querySelector('.bg-white\\/60');
                                    if (spinner) {
                                      spinner.innerHTML = `
                                        <div class="flex flex-col items-center">
                                          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                          <span class="text-gray-400 text-sm text-center">Image unavailable</span>
                                          <button class="mt-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded" onclick="
                                            const imgEl = this.closest('.aspect-\\[3\\/4\\]').querySelector('img');
                                            if (imgEl) {
                                              imgEl.style.display = 'block';
                                              imgEl.src = '${image.url}?retry=' + Date.now();
                                              this.closest('.bg-white\\/60').classList.add('hidden');
                                            }
                                          ">
                                            Retry loading
                                          </button>
                                        </div>
                                      `;
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                          
                          {/* Info overlay */}
                          <div className="p-2 bg-gray-900/90 absolute bottom-0 left-0 right-0">
                            <p className="text-xs text-gray-300 truncate">Source: {image.source}</p>
                          </div>
                          
                          {/* Selected indicator */}
                          {selectedImageUrl === image.url && (
                            <div className="absolute top-2 right-2 bg-amber-500 rounded-full p-1.5 shadow-md z-20">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Show a "no images found" message if no valid images were loaded */}
                    {imageSearchResults.length === 0 && (
                      <div className="bg-gray-900/50 rounded-lg p-8 text-center">
                        <p className="text-gray-300 mb-4">No images found for this spirit.</p>
                        <button
                          onClick={searchBottleImages}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    )}
                    
                    <div className="flex justify-between mt-6">
                      <button
                        onClick={searchBottleImages}
                        disabled={isImageSearchLoading}
                        className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 flex items-center"
                      >
                        {isImageSearchLoading ? (
                          <>
                            <div className="w-4 h-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Find More Images
                          </>
                        )}
                      </button>
                      
                      <div className="space-x-3">
                        <button
                          onClick={() => setShowImageOptions(false)}
                          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => selectedImageUrl && updateBottleImage(selectedImageUrl)}
                          disabled={!selectedImageUrl}
                          className={`px-4 py-2 rounded-md flex items-center ${
                            selectedImageUrl 
                              ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {selectedImageUrl ? (
                            <>
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Update Image
                            </>
                          ) : 'Select an Image'}
                        </button>
                      </div>
                    </div>

                    {selectedImageIndex !== null && previewUrl && (
                      <div className="mt-4 p-4 bg-black/30 rounded-lg border border-white/10">
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                          <div className="flex items-center justify-center bg-gray-900/50 rounded-lg p-4 w-full md:w-1/3 h-[250px]">
                            <img
                              src={previewUrl}
                              alt="Selected spirit"
                              className="max-h-[220px] max-w-[90%] object-contain rounded-lg shadow-lg"
                            />
                          </div>
                          <div className="space-y-2 w-full md:w-2/3">
                            <h5 className="font-medium text-white">Selected Image</h5>
                            <p className="text-sm text-gray-300 break-words">
                              Source: {selectedImageIndex !== null && imageSearchResults[selectedImageIndex]?.source || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-300 break-words">
                              {spirit.brand} {spirit.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Details Column */}
            <div className="md:w-2/3 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span className="capitalize">{spirit.type}</span>
                </div>
                {spirit.isFavorite && (
                  <div className="bg-amber-500 text-white p-1.5 rounded-full">
                    <Star className="w-4 h-4 fill-white" />
                  </div>
                )}
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">{spirit.name}</h1>
              <h2 className="text-xl text-gray-300 mb-4">{spirit.brand}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {spirit.proof && (
                  <div className="flex items-center">
                    <Droplets className="w-5 h-5 text-amber-500 mr-2" />
                    <div>
                      <div className="text-sm text-gray-400">Proof</div>
                      <div className="text-lg font-semibold text-white">{spirit.proof}°</div>
                    </div>
                  </div>
                )}
                
                {spirit.price && (
                  <div className="flex items-center">
                    <span className="w-5 h-5 text-amber-500 mr-2 font-bold">$</span>
                    <div>
                      <div className="text-sm text-gray-400">Price</div>
                      <div className="text-lg font-semibold text-white">${Number(spirit.price).toFixed(2)}</div>
                    </div>
                  </div>
                )}
                
                {typeof spirit.bottleLevel === 'number' && (
                  <div className="col-span-1 md:col-span-2 mt-4">
                    <ModernBottleLevelIndicator 
                      level={Math.max(0, Math.min(100, spirit.bottleLevel || 0))} 
                      interactive={false}
                      className="max-w-md"
                    />
                  </div>
                )}
                
                {/* Star Rating Component */}
                <div className="col-span-1 md:col-span-2 mt-4">
                  <div className="flex items-center">
                    <Wine className="w-5 h-5 text-amber-500 mr-2" />
                    <div className="text-sm text-gray-400 mr-3">Your Rating:</div>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                        <button
                          key={star}
                          onClick={(e) => handleRatingChange(star, e)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-6 h-6 cursor-pointer ${
                              star <= (rating || 0)
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-3 text-lg font-semibold text-white">
                        {displayRating > 0 ? `${displayRating}/10` : 'Not rated'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tasting Notes Section */}
              {(selectedNotes.nose.length > 0 || selectedNotes.palate.length > 0 || selectedNotes.finish.length > 0) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Your Tasting Notes</h3>
                  <div className="space-y-3">
                    {selectedNotes.nose.length > 0 && (
                      <div>
                        <h4 className="text-amber-500 font-medium mb-1">Nose</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedNotes.nose.map((note, index) => (
                            <span 
                              key={`nose-${index}`}
                              className="bg-gray-800 text-gray-200 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                            >
                              {note.trim()}
                              <button
                                onClick={(e) => handleRemoveNote('nose', note, e)}
                                className="ml-1 hover:text-red-500 transition-colors focus:outline-none"
                                aria-label={`Remove ${note} note`}
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedNotes.palate.length > 0 && (
                      <div>
                        <h4 className="text-amber-500 font-medium mb-1">Palate</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedNotes.palate.map((note, index) => (
                            <span 
                              key={`palate-${index}`}
                              className="bg-gray-800 text-gray-200 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                            >
                              {note.trim()}
                              <button
                                onClick={(e) => handleRemoveNote('palate', note, e)}
                                className="ml-1 hover:text-red-500 transition-colors focus:outline-none"
                                aria-label={`Remove ${note} note`}
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedNotes.finish.length > 0 && (
                      <div>
                        <h4 className="text-amber-500 font-medium mb-1">Finish</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedNotes.finish.map((note, index) => (
                            <span 
                              key={`finish-${index}`}
                              className="bg-gray-800 text-gray-200 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                            >
                              {note.trim()}
                              <button
                                onClick={(e) => handleRemoveNote('finish', note, e)}
                                className="ml-1 hover:text-red-500 transition-colors focus:outline-none"
                                aria-label={`Remove ${note} note`}
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Description */}
              {spirit.description && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                  <p className="text-gray-300">{spirit.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Web Data Section */}
        {webData ? (
          <div className="space-y-8">
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <span className="text-amber-500 mr-2">•</span>
                About {spirit.brand} {spirit.name}
                <span className="text-amber-500 ml-2">•</span>
              </h2>
              <p className="text-gray-300 mb-4">
                Below is specific information about this exact bottle in your collection. This data has been gathered from various sources to provide you with detailed insights about this particular expression.
              </p>
              
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
                <span>Specific search:</span>
                <code className="bg-black/20 px-2 py-1 rounded text-amber-300">{webData.query}</code>
              </div>
            </div>
            
            {/* Distillery Info */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
              <div className="flex items-center mb-4">
                <Building2 className="w-6 h-6 text-amber-500 mr-2" />
                <h2 className="text-2xl font-semibold text-white">Distillery Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <h3 className="text-amber-500 font-medium mb-1">Name</h3>
                    <p className="text-white text-lg">{webData.relatedInfo.distillery.name}</p>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-amber-500 font-medium mb-1">Location</h3>
                    <p className="text-white">{webData.relatedInfo.distillery.location}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-amber-500 font-medium mb-1">Founded</h3>
                    <p className="text-white">{webData.relatedInfo.distillery.founded}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-amber-500 font-medium mb-1">About</h3>
                  <p className="text-gray-300">{webData.relatedInfo.distillery.description}</p>
                </div>
              </div>
            </div>
            
            {/* Bottle-Specific Information */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
              <div className="flex items-center mb-4">
                <Wine className="w-6 h-6 text-amber-500 mr-2" />
                <h2 className="text-2xl font-semibold text-white">Bottle Details</h2>
              </div>
              
              <p className="text-gray-300 mb-4">
                The market values shown below are based on aggregated retail and secondary market data for {spirit.brand} {spirit.name}. 
                Prices may vary based on region, availability, and specific bottle details.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-black/20 rounded-lg p-4">
                  <h3 className="text-amber-500 font-medium mb-1">Market Value</h3>
                  <div className="mt-2">
                    <p className="text-2xl font-bold text-white">${webData.relatedInfo.product.price.avg}</p>
                    <div className="flex items-center mt-1">
                      <div className="h-1 bg-gray-700 flex-grow rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-amber-500" 
                          style={{ 
                            width: `${Math.min(100, Math.max(0, 
                              (Number(spirit.price || 0) - webData.relatedInfo.product.price.low) / 
                              (webData.relatedInfo.product.price.high - webData.relatedInfo.product.price.low) * 100
                            ))}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 flex justify-between mt-1">
                      <span>${webData.relatedInfo.product.price.low}</span>
                      <span>${webData.relatedInfo.product.price.high}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {spirit.price ? (
                        Number(spirit.price) < webData.relatedInfo.product.price.avg ? 
                          `You paid ${((webData.relatedInfo.product.price.avg - Number(spirit.price)) / webData.relatedInfo.product.price.avg * 100).toFixed(0)}% below market value` :
                          Number(spirit.price) > webData.relatedInfo.product.price.avg ?
                          `You paid ${((Number(spirit.price) - webData.relatedInfo.product.price.avg) / webData.relatedInfo.product.price.avg * 100).toFixed(0)}% above market value` :
                          "You paid exactly the market value"
                      ) : "Add your purchase price to compare with market value"}
                    </p>
                  </div>
                </div>
                
                <div className="bg-black/20 rounded-lg p-4">
                  <h3 className="text-amber-500 font-medium mb-1">Average Rating</h3>
                  <div className="flex items-center mt-2">
                    <span className="text-2xl font-bold text-white">{webData.relatedInfo.product.avgRating}</span>
                    <span className="text-gray-400 text-sm ml-1">/10</span>
                    <div className="ml-3 flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.round(parseFloat(webData.relatedInfo.product.avgRating) / 2)
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center">
                    <div className="h-1 bg-gray-700 flex-grow rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500" 
                        style={{ 
                          width: `${Math.min(100, Math.max(0, parseFloat(webData.relatedInfo.product.avgRating) * 10))}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Based on expert reviews and community ratings
                  </p>
                </div>
              </div>
              
              {/* Release Year (if available) */}
              {webData.relatedInfo.product.releaseYear && (
                <div className="mb-4">
                  <h3 className="text-amber-500 font-medium mb-2">Release Year</h3>
                  <p className="text-white">{webData.relatedInfo.product.releaseYear}</p>
                </div>
              )}
              
              <div>
                <h3 className="text-amber-500 font-medium mb-2">Awards & Recognition</h3>
                <ul className="list-disc pl-5 text-gray-300 space-y-1">
                  {webData.relatedInfo.product.awards.map((award, index) => (
                    <li key={index}>{award}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Expert Tasting Notes */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
              <h2 className="text-2xl font-semibold text-white mb-4">Expert Tasting Notes</h2>
              
              {webData.relatedInfo?.tastingNotes?.expert ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-amber-500 font-medium mb-2">Aroma</h3>
                    <p className="text-gray-300">
                      {webData.relatedInfo.tastingNotes.expert.aroma || "No aroma information available"}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-amber-500 font-medium mb-2">Taste</h3>
                    <p className="text-gray-300">
                      {webData.relatedInfo.tastingNotes.expert.taste || "No taste information available"}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-amber-500 font-medium mb-2">Finish</h3>
                    <p className="text-gray-300">
                      {webData.relatedInfo.tastingNotes.expert.finish || "No finish information available"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-black/20 rounded-lg p-4 text-gray-400">
                  <p>No expert tasting notes available for this spirit.</p>
                </div>
              )}
              
              {webData.relatedInfo?.tastingNotes?.community?.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-amber-500 font-medium mb-2">Community Notes</h3>
                  <ul className="list-disc pl-5 text-gray-300 space-y-1">
                    {webData.relatedInfo.tastingNotes.community.map((note, index) => (
                      <li key={index}>{typeof note === 'string' ? note : 'Invalid note format'}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-6 bg-black/20 rounded-lg p-4 text-gray-400">
                  <h3 className="text-amber-500 font-medium mb-2">Community Notes</h3>
                  <p>No community tasting notes available yet.</p>
                </div>
              )}
            </div>
            
            {/* Related Articles */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
              <h2 className="text-2xl font-semibold text-white mb-4">Related Articles</h2>
              
              <div className="space-y-4">
                {webData.results.map((result, index) => (
                  <div key={index} className="border-b border-gray-700 pb-4 last:border-0 last:pb-0">
                    <a 
                      href={result.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-start group"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-white group-hover:text-amber-500 transition-colors">{result.title}</h3>
                        <p className="text-gray-400 text-sm mt-1">{result.source}</p>
                        <p className="text-gray-300 mt-1">{result.description}</p>
                      </div>
                      <ExternalLink className="w-5 h-5 text-amber-500 mt-1 ml-2 flex-shrink-0" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 text-center">
            <h2 className="text-xl text-gray-300 mb-3">
              {data.webError || 'Specific bottle information not yet available'}
            </h2>
            <p className="text-gray-400">
              Click the button below to search for detailed information about this specific bottle.
            </p>
            <div className="mb-6 flex flex-wrap gap-2 justify-center mt-6">
              <button
                onClick={fetchSpiritInfo}
                disabled={isWebSearchLoading}
                className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-md transition-colors"
              >
                {isWebSearchLoading ? (
                  <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                {isWebSearchLoading ? 'Searching...' : 'Find Bottle Info'}
              </button>

              <button
                onClick={handleShare}
                className="inline-flex items-center bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-md transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Confirm Deletion</h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to remove <span className="font-semibold text-amber-500">{spirit.name}</span> from your collection? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={forceRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Refresh Page
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 