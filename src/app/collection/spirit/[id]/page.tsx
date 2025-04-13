'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { Spirit } from '@/types';
import { Wine, ArrowLeft, Building2, Award, Droplets, Star, Tag, ExternalLink, Share2, Copy, Check, Search, Edit, X, Image as ImageIcon, Trash2, Heart, Camera, RefreshCw, Info, Plus } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ModernBottleLevelIndicator from '@/components/ui/ModernBottleLevelIndicator';
import Image from 'next/image';
import SafeImage from '@/components/ui/SafeImage';
import { getSafeImageUrl } from '@/lib/spiritUtils';

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
  const { data: session, status } = useSupabaseSession();
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
  const webSearchAttempted = useRef<boolean>(false);
  
  const spiritId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'loading') return;
    
    // Create an AbortController to cancel pending requests when component unmounts
    const abortController = new AbortController();
    
    // Only fetch if we don't already have data or if we have an error
    if (!data || error) {
      // Fetch spirit details when session is available
      fetchSpiritDetails(abortController.signal);
    }
    
    // Cleanup function to abort fetch if component unmounts or deps change
    return () => {
      abortController.abort();
    };
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
      // Add additional check to avoid repeated fetches if there was a previous web search error
      if (!webData && !webSearchAttempted.current) {
        webSearchAttempted.current = true;
        fetchSpiritInfo();
      }
    }
  }, [data, isWebSearchLoading, webData]);

  useEffect(() => {
    // Parse tasting notes when spirit data is available
    if (data?.spirit) {
      const parseNotes = (notesStr: string | undefined | null | string[]) => {
        // Empty string, undefined, or literal "null" string should return empty array
        if (notesStr === undefined || notesStr === null || notesStr === 'null' || notesStr === '') return [];
        
        try {
          // First check if it's already an array
          if (Array.isArray(notesStr)) {
            // Filter out any null, undefined or "null" string values, but preserve empty arrays
            return notesStr.filter(note => note !== null && note !== undefined && note !== 'null' && note !== '');
          }
          
          // Try to parse as JSON (for notes stored as arrays)
          if (typeof notesStr === 'string') {
            try {
              const parsed = JSON.parse(notesStr);
              // Ensure the result is an array and filter out null/undefined/null strings
              if (Array.isArray(parsed)) {
                return parsed.filter(note => note !== null && note !== undefined && note !== 'null' && note !== '');
              } else if (parsed !== null && parsed !== undefined && parsed !== 'null' && parsed !== '') {
                return [parsed];
              } else {
                return [];
              }
            } catch (e) {
              // If JSON parsing fails, split by comma (for notes stored as comma-separated strings)
              return notesStr.split(',')
                .map(n => n && typeof n.trim === 'function' ? n.trim() : n)
                .filter(n => n !== null && n !== undefined && n !== 'null' && n !== '');
            }
          }
          
          // Fallback - convert to string and return single item array
          const strValue = String(notesStr);
          return strValue !== 'null' ? [strValue] : [];
        } catch (e) {
          console.error('Error parsing tasting notes:', e);
          return [];
        }
      };
      
      // Parse each tasting note category
      const parsedNotes = {
        nose: parseNotes(data.spirit.nose),
        palate: parseNotes(data.spirit.palate),
        finish: parseNotes(data.spirit.finish)
      };
      
      console.log('Parsed tasting notes:', parsedNotes);
      
      // Only update state if the parsed notes are different from the current state
      const hasChanged = 
        JSON.stringify(parsedNotes.nose) !== JSON.stringify(selectedNotes.nose) ||
        JSON.stringify(parsedNotes.palate) !== JSON.stringify(selectedNotes.palate) ||
        JSON.stringify(parsedNotes.finish) !== JSON.stringify(selectedNotes.finish);
        
      if (hasChanged) {
        setSelectedNotes(parsedNotes);
      }
    }
  }, [data?.spirit?.id]);

  const fetchSpiritDetails = async (signal?: AbortSignal) => {
    // Don't set loading state again if we're already loading - prevents UI flicker
    if (!isLoading) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      // Add cache-busting parameter to avoid browser cache issues
      const cacheBuster = `_t=${Date.now()}`;
      const response = await fetch(`/api/spirit/${spiritId}?${cacheBuster}`, { 
        signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch spirit details');
      }
      
      const responseData = await response.json();
      setData(responseData);
      
      // If webData is already included from the API, set it directly
      if (responseData.webData) {
        setWebData(responseData.webData);
      }
    } catch (error) {
      // Only set error if the request wasn't aborted
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Error fetching spirit details:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
        toast('Failed to load spirit details', { icon: '❌' });
      }
    } finally {
      // Only update loading state if the request wasn't aborted
      if (signal?.aborted !== true) {
        setIsLoading(false);
      }
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
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update rating');
      }
      
      const updatedSpirit = await response.json();
      
      // Update the local state with the updated spirit
      if (data) {
        setData({
          ...data,
          spirit: updatedSpirit
        });
      }
      
      toast.success('Rating updated');
    } catch (error) {
      console.error('Error updating rating:', error);
      toast.error('Failed to update rating');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveNote = async (category: 'nose' | 'palate' | 'finish', noteToRemove: string, e?: React.MouseEvent) => {
    // Prevent default button behavior
    e?.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Filter out the note we want to remove
      const updatedNotes = {
        ...selectedNotes,
        [category]: selectedNotes[category].filter(note => note !== noteToRemove)
      };
      
      // Update the local state first for immediate UI feedback
      setSelectedNotes(updatedNotes);
      
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
      
      console.log(`Removing "${noteToRemove}" from ${category}:`, updateData);
      
      const response = await fetch(`/api/collection/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to remove ${category} note`);
      }
      
      const updatedSpirit = await response.json();
      
      // Update the local state with the updated spirit
      if (data) {
        setData({
          ...data,
          spirit: updatedSpirit
        });
      }
      
      toast.success(`Removed note from ${category}`);
    } catch (error) {
      console.error(`Error removing ${category} note:`, error);
      toast.error(`Failed to remove note from ${category}`);
      
      // Revert the local state change on error
      if (data?.spirit) {
        const parseNotes = (notesStr: string | undefined | null | string[]) => {
          // Empty string, undefined, or literal "null" string should return empty array
          if (notesStr === undefined || notesStr === null || notesStr === 'null' || notesStr === '') return [];
          
          try {
            // First check if it's already an array
            if (Array.isArray(notesStr)) {
              // Filter out any null, undefined or "null" string values, but preserve empty arrays
              return notesStr.filter(note => note !== null && note !== undefined && note !== 'null' && note !== '');
            }
            
            // Try to parse as JSON (for notes stored as arrays)
            if (typeof notesStr === 'string') {
              try {
                const parsed = JSON.parse(notesStr);
                // Ensure the result is an array and filter out null/undefined/null strings
                if (Array.isArray(parsed)) {
                  return parsed.filter(note => note !== null && note !== undefined && note !== 'null' && note !== '');
                } else if (parsed !== null && parsed !== undefined && parsed !== 'null' && parsed !== '') {
                  return [parsed];
                } else {
                  return [];
                }
              } catch (e) {
                // If JSON parsing fails, split by comma (for notes stored as comma-separated strings)
                return notesStr.split(',')
                  .map(n => n && typeof n.trim === 'function' ? n.trim() : n)
                  .filter(n => n !== null && n !== undefined && n !== 'null' && n !== '');
              }
            }
            
            // Fallback - convert to string and return single item array
            const strValue = String(notesStr);
            return strValue !== 'null' ? [strValue] : [];
          } catch (e) {
            console.error('Error parsing tasting notes:', e);
            return [];
          }
        };
        
        setSelectedNotes({
          nose: parseNotes(data.spirit.nose),
          palate: parseNotes(data.spirit.palate),
          finish: parseNotes(data.spirit.finish)
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new function to search for bottle images using Google
  const searchBottleImages = async () => {
    if (!data?.spirit) return;
    
    setIsImageSearchLoading(true);
    setImageSearchResults([]);
    setShowImageOptions(false);
    setSelectedImageUrl(null);
    
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
        const validImages = searchResponse.images
          .filter(img => {
            try {
              new URL(img.url);
              return true;
            } catch {
              console.warn(`Invalid image URL: ${img.url}`);
              return false;
            }
          })
          // Limit to 10 images max
          .slice(0, 10);
        
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
      
      // Force reload of the image to show updated version
      const timestamp = Date.now();
      const imageElement = document.querySelector('.spirit-bottle-image') as HTMLImageElement;
      if (imageElement) {
        const currentSrc = imageElement.src;
        const newSrc = currentSrc.includes('?') 
          ? currentSrc.replace(/(_cb=|_t=)[^&]+/, `$1${timestamp}`) 
          : `${currentSrc}?_cb=${timestamp}`;
          
        imageElement.src = newSrc;
      }
    } catch (error) {
      console.error('Error updating bottle image:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update bottle image');
    } finally {
      setIsLoading(false);
    }
  };

  // Modify forceRefresh function to be safer
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
    
    // Don't use router.push with a dynamic timestamp as it causes infinite refreshes
    // Instead, force a data refresh by calling fetchSpiritDetails
    if (typeof window !== 'undefined') {
      // Create a new AbortController for this refresh
      const refreshController = new AbortController();
      // Clear existing data and trigger fresh fetch
      setData(null);
      fetchSpiritDetails(refreshController.signal);
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
        <div className="fixed inset-0 overflow-hidden">
          <SafeImage 
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
                    <SafeImage
                      src={getSafeImageUrl(spirit.imageUrl)}
                      alt={spirit.name}
                      className="max-w-[95%] max-h-[90%] object-contain spirit-bottle-image transition-transform hover:scale-[1.02]"
                      width={300}
                      height={500}
                      style={{ maxHeight: "min(70vh, 600px)" }} 
                      loading="eager"
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
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                  <div className="bg-gray-900 rounded-lg w-full max-w-4xl overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-center p-5 border-b border-gray-800">
                      <h2 className="text-xl font-bold text-white">Select Bottle Image</h2>
                      <button 
                        onClick={() => setShowImageOptions(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Description */}
                    <div className="px-5 py-3">
                      <p className="text-gray-400">
                        Found {imageSearchResults.length} potential images for {spirit.brand} {spirit.name}.
                      </p>
                      <p className="text-gray-500 text-sm">
                        Select the image that best represents this bottle in your collection.
                      </p>
                    </div>

                    {/* Image Grid */}
                    <div className="px-5 py-2 flex-grow overflow-y-auto">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {imageSearchResults.map((image, index) => (
                          <div 
                            key={index}
                            className={`aspect-[1/1.2] bg-white rounded-md overflow-hidden cursor-pointer ${
                              selectedImageUrl === image.url ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-gray-900' : ''
                            }`}
                            onClick={() => {
                              setSelectedImageUrl(image.url);
                              setSelectedImageIndex(index);
                            }}
                          >
                            <div className="w-full h-full relative bg-white">
                              {/* Loading spinner */}
                              <div className="absolute inset-0 flex items-center justify-center bg-white z-0">
                                <div className="w-8 h-8 border-t-2 border-b-2 border-gray-400 rounded-full animate-spin"></div>
                              </div>
                              
                              {/* Image */}
                              <img 
                                src={image.url} 
                                alt={image.alt || 'Bottle image'}
                                className="w-full h-full object-contain z-10 relative"
                                loading="lazy"
                                onLoad={(e) => {
                                  const target = e.target as HTMLElement;
                                  const spinner = target.parentElement?.querySelector('div.absolute');
                                  if (spinner) spinner.classList.add('hidden');
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/images/bottle-placeholder.png';
                                  const spinner = target.parentElement?.querySelector('div.absolute');
                                  if (spinner) spinner.classList.add('hidden');
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer with buttons */}
                    <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
                      <button
                        onClick={() => setShowImageOptions(false)}
                        className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => selectedImageUrl && updateBottleImage(selectedImageUrl)}
                        disabled={!selectedImageUrl}
                        className={`px-6 py-2 rounded transition-colors ${
                          selectedImageUrl 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Select an Image
                      </button>
                    </div>
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
              {(selectedNotes.nose.length > 0 || 
                selectedNotes.palate.length > 0 || 
                selectedNotes.finish.length > 0) && (
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
                              {note && note.trim ? note.trim() : note}
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
                              {note && note.trim ? note.trim() : note}
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
                              {note && note.trim ? note.trim() : note}
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