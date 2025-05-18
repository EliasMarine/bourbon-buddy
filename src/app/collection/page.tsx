'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import SpiritCard from '@/components/collection/SpiritCard';
import AddSpiritForm from '@/components/collection/AddSpiritForm';
import { Spirit } from '@/types';
import { toast } from 'react-hot-toast';
import { ChevronDown, ChevronUp, Plus, RefreshCw } from 'lucide-react';
import useSWR, { SWRConfiguration } from 'swr';
import { v4 as uuidv4 } from 'uuid';

// Create a custom error class with the additional properties
class FetchError extends Error {
  info?: any;
  status?: number;
  
  constructor(message: string) {
    super(message);
    this.name = 'FetchError';
  }
}

// Custom fetcher with error and retry handling
const collectionFetcher = async (url: string) => {
  try {
    console.log('Fetching data from:', url);
    const res = await fetch(url);
    
    // Handle HTTP errors
    if (!res.ok) {
      console.error('Fetch error, status:', res.status);
      
      const errorData = await res.json().catch(() => ({}));
      console.error('Error response data:', errorData);
      
      const error = new FetchError('An error occurred while fetching the data.');
      // Add extra info to the error object
      error.info = errorData;
      error.status = res.status;
      throw error;
    }
    
    const data = await res.json();
    
    // Add basic validation to verify data structure
    if (!data || !Array.isArray(data.spirits)) {
      console.warn('Unexpected data format received:', data);
      // Fix data format if possible
      if (data && !data.spirits) {
        return { spirits: [] };
      }
    }
    
    return data;
  } catch (err) {
    console.error('Error in collection fetcher:', err);
    // If it's already a FetchError, rethrow
    if (err instanceof FetchError) throw err;
    
    // Otherwise, create a new FetchError with the message
    const error = new FetchError('Failed to fetch collection data');
    error.info = { originalError: err };
    throw error;
  }
};

// Define SortableField type before its use
type SortableField = 'name' | 'price' | 'rating' | 'createdAt' | 'proof';

// Function to sort spirits
const sortSpirits = (spiritsList: Spirit[], sortBy: SortableField, sortOrder: 'asc' | 'desc'): Spirit[] => {
  return [...spiritsList].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;

    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '');
        break;
      case 'price':
        const priceA = typeof a.price === 'number' ? a.price : (sortOrder === 'asc' ? Infinity : -Infinity);
        const priceB = typeof b.price === 'number' ? b.price : (sortOrder === 'asc' ? Infinity : -Infinity);
        comparison = priceA - priceB;
        break;
      case 'rating':
        const ratingA = typeof a.rating === 'number' ? a.rating : (sortOrder === 'asc' ? Infinity : -Infinity);
        const ratingB = typeof b.rating === 'number' ? b.rating : (sortOrder === 'asc' ? Infinity : -Infinity);
        comparison = ratingA - ratingB;
        break;
      case 'proof':
        const proofA = typeof a.proof === 'number' ? a.proof : (sortOrder === 'asc' ? Infinity : -Infinity);
        const proofB = typeof b.proof === 'number' ? b.proof : (sortOrder === 'asc' ? Infinity : -Infinity);
        comparison = proofA - proofB;
        break;
      case 'createdAt':
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (sortOrder === 'asc' ? Infinity : -Infinity);
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (sortOrder === 'asc' ? Infinity : -Infinity);
        comparison = dateA - dateB;
        break;
      default:
        // Should not happen with SortableField type, but as a fallback:
        const exhaustiveCheck: never = sortBy;
        return exhaustiveCheck;
    }

    return sortOrder === 'asc' ? comparison : comparison * -1;
  });
};

// Create a dedicated error component for data fetch errors
function FetchErrorComponent({ error, onRetry }: { error: any, onRetry: () => void }) {
  return (
    <div className="py-20 text-center bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
      <div className="max-w-md mx-auto p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Unable to load your collection</h3>
        <p className="text-gray-300 mb-6">
          {error?.info?.message || error?.message || "We couldn't load your spirits. Please try again."}
        </p>
        <button
          onClick={onRetry}
          className="bg-amber-500 hover:bg-amber-600 transition-colors text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    </div>
  );
}

export default function CollectionPage() {
  const router = useRouter();
  const { data: session, status } = useSupabaseSession();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const syncAttempted = useRef(false);
  
  // Filter States
  const [filterName, setFilterName] = useState('');
  const [filterType, setFilterType] = useState<string>(''); // Single type selection for now
  const [filterPriceMin, setFilterPriceMin] = useState<string>('');
  const [filterPriceMax, setFilterPriceMax] = useState<string>('');
  const [filterCountry, setFilterCountry] = useState<string>('');
  const [filterRegion, setFilterRegion] = useState<string>('');
  const [filterProofMin, setFilterProofMin] = useState<string>('');
  const [filterProofMax, setFilterProofMax] = useState<string>('');
  
  // Sorting States
  const [sortBy, setSortBy] = useState<SortableField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;
  
  // Define SWR key based on authentication state and current filters/sort/pagination
  const shouldFetch = status === 'authenticated' && session?.user;
  
  const swrKey = useMemo(() => {
    if (!shouldFetch) return null;

    const params = new URLSearchParams();
    if (filterName) params.append('name', filterName);
    if (filterType) params.append('type', filterType);
    if (filterPriceMin) params.append('priceMin', filterPriceMin);
    if (filterPriceMax) params.append('priceMax', filterPriceMax);
    if (filterCountry) params.append('country', filterCountry);
    if (filterRegion) params.append('region', filterRegion);
    if (filterProofMin) params.append('proofMin', filterProofMin);
    if (filterProofMax) params.append('proofMax', filterProofMax);
    
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);
    params.append('page', currentPage.toString());
    params.append('limit', ITEMS_PER_PAGE.toString());

    return `/api/collection?${params.toString()}`;
  }, [shouldFetch, filterName, filterType, filterPriceMin, filterPriceMax, filterCountry, filterRegion, filterProofMin, filterProofMax, sortBy, sortOrder, currentPage]);

  // Use SWR for data fetching
  const { 
    data: apiResponse, // Renamed to apiResponse to avoid conflict 
    error, 
    isLoading: isSWRLoading, 
    isValidating,
    mutate 
  } = useSWR<
    { spirits: Spirit[], totalItems: number, totalPages: number, currentPage: number } | undefined,
    FetchError,
    string | null // Key type for SWR
  >(swrKey, collectionFetcher, {
    revalidateIfStale: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 0,        // Disable polling
    shouldRetryOnError: true,
    errorRetryCount: 3,        // Corrected from retry: 3
    errorRetryInterval: 5000,  // 5 seconds between retries
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // Don't retry on 404s or 401s
      if (error.status === 404 || error.status === 401) return;
      
      // Only retry for specific errors and up to 3 times
      if (retryCount >= 3) return;
      
      // Use exponential backoff for retries
      const delay = Math.min(1000 * 2 ** retryCount, 30000);
      setTimeout(() => revalidate({ retryCount }), delay);
    }
  });
  
  // Process the data from API response
  const spirits = apiResponse?.spirits || [];
  const totalPages = apiResponse?.totalPages || 0;
  // const totalItems = apiResponse?.totalItems || 0; // Available if needed
  // Note: currentPage state is the source of truth for the request, 
  // apiResponse.currentPage can be used for asserting or display if needed.

  // Derive available options for filters from the spirits data
  const availableTypes = useMemo(() => {
    if (!Array.isArray(spirits)) return [];
    return Array.from(new Set(spirits.map(s => s.type).filter(Boolean) as string[])).sort();
  }, [spirits]);

  const availableCountries = useMemo(() => {
    if (!Array.isArray(spirits)) return [];
    return Array.from(new Set(spirits.map(s => s.country).filter(Boolean) as string[])).sort();
  }, [spirits]);

  const availableRegions = useMemo(() => {
    // This could be more dynamic based on selected country in a more advanced setup
    if (!Array.isArray(spirits)) return [];
    return Array.from(new Set(spirits.map(s => s.region).filter(Boolean) as string[])).sort();
  }, [spirits]);
  
  // Filter and sanitize spirits to prevent display issues
  const sanitizedSpirits = useMemo(() => {
    // Guard against undefined or null spirits array
    if (!Array.isArray(spirits)) {
      console.warn('Expected spirits to be an array, got:', spirits);
      return [];
    }
    
    return spirits.map(spirit => {
      if (!spirit) return null;
      
      // Check if imageUrl is valid (not null, undefined, empty string, or invalid URL format)
      let validImageUrl = spirit.imageUrl;
      
      // More comprehensive URL validation to handle various edge cases
      const isValidUrl = (url: string | null | undefined): boolean => {
        if (!url || url.trim() === '') return false; 
        
        // First check with a simple regex for http/https
        const hasValidProtocol = /^https?:\/\//.test(url);
        if (!hasValidProtocol) return false;
        
        // Additional check for absolute URL format
        try {
          new URL(url);
          return true;
        } catch (e) {
          return false;
        }
      };
      
      if (!isValidUrl(validImageUrl)) {
        validImageUrl = undefined;
      }
      
      return {
        ...spirit,
        imageUrl: validImageUrl
      };
    }).filter(Boolean); // Remove any null entries
  }, [spirits]);
  
  // Apply filters to sanitized spirits
  const filteredSpirits = useMemo<Spirit[]>(() => {
    if (!Array.isArray(sanitizedSpirits)) return [];
    // Ensure we are working with an array of actual Spirit objects after sanitization
    const trulySanitizedSpirits = sanitizedSpirits.filter(Boolean) as Spirit[];

    return trulySanitizedSpirits.filter(spirit => {
      // The 'spirit' here is now guaranteed to be Spirit, not Spirit | null
      // if (!spirit) return false; // This check is theoretically not needed if trulySanitizedSpirits is Spirit[]

      const nameMatch = filterName ? spirit.name.toLowerCase().includes(filterName.toLowerCase()) : true;
      const typeMatch = filterType ? spirit.type === filterType : true;
      
      const priceMin = parseFloat(filterPriceMin);
      const priceMax = parseFloat(filterPriceMax);
      const spiritPrice = spirit.price ?? null;

      const priceMinMatch = !isNaN(priceMin) && spiritPrice !== null ? spiritPrice >= priceMin : true;
      const priceMaxMatch = !isNaN(priceMax) && spiritPrice !== null ? spiritPrice <= priceMax : true;
      
      const countryMatch = filterCountry ? spirit.country === filterCountry : true;
      const regionMatch = filterRegion ? spirit.region === filterRegion : true;

      const proofMin = parseFloat(filterProofMin);
      const proofMax = parseFloat(filterProofMax);
      const spiritProof = spirit.proof ?? null;

      const proofMinMatch = !isNaN(proofMin) && spiritProof !== null ? spiritProof >= proofMin : true;
      const proofMaxMatch = !isNaN(proofMax) && spiritProof !== null ? spiritProof <= proofMax : true;

      return nameMatch && typeMatch && priceMinMatch && priceMaxMatch && countryMatch && regionMatch && proofMinMatch && proofMaxMatch;
    });
  }, [sanitizedSpirits, filterName, filterType, filterPriceMin, filterPriceMax, filterCountry, filterRegion, filterProofMin, filterProofMax]);
  
  // Sort the sanitized spirits
  const sortedSpirits = useMemo<Spirit[]>(() => sortSpirits(filteredSpirits, sortBy, sortOrder), [filteredSpirits, sortBy, sortOrder]);
  
  // Paginate the sorted spirits
  const paginatedSpirits = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedSpirits.slice(startIndex, endIndex);
  }, [sortedSpirits, currentPage]);

  // Handler functions for pagination
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);
  
  // Handle 401 errors by attempting to sync the user
  useEffect(() => {
    const handle401Error = async () => {
      if (error && error.status === 401 && !syncAttempted.current) {
        syncAttempted.current = true;
        try {
          console.log('Authentication failed, attempting to sync user...');
          await fetch('/api/auth/sync-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          console.log('User sync completed, retrying collection fetch...');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Revalidate the data
          mutate();
        } catch (syncError) {
          console.error('Failed to sync user:', syncError);
          toast('Failed to sync user account', { icon: '❌' });
        }
      }
    };
    
    handle401Error();
  }, [error, mutate]);
  
  // Show error toast when fetch fails
  useEffect(() => {
    if (error && !isValidating) {
      toast('Failed to load collection', { icon: '❌' });
      console.error('Collection fetch error:', error);
    }
  }, [error, isValidating]);

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      const response = await fetch(`/api/collection/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFavorite }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Server response:', data);
        throw new Error(data.error || 'Failed to update favorite status');
      }

      // Update the local data with SWR
      mutate(current => {
        if (!current) return current; // Return current (undefined) if no data to update
        
        const updatedSpirits = current.spirits.map((spirit: Spirit) => 
          spirit.id === id ? { ...spirit, isFavorite } : spirit
        );
        
        return { ...current, spirits: updatedSpirits }; // Preserve other fields like totalItems, totalPages
      }, false); // false means don't revalidate

      // Show success message
      toast(
        isFavorite 
          ? 'Added to favorites' 
          : 'Removed from favorites',
        { icon: isFavorite ? '❤️' : '🤍' }
      );
    } catch (error) {
      console.error('Failed to update favorite status:', error);
      toast('Failed to update favorite status', { icon: '❌' });
    }
  };

  const handleAddSpirit = async (formData: FormData) => {
    setIsManualLoading(true);
    try {
      if (!session || !session.user) {
        console.error('No active session found');
        throw new Error('You must be logged in to add spirits');
      }

      // Convert FormData to a JavaScript object
      const jsonData: Record<string, any> = {
        id: uuidv4(), // Generate a UUID for the new spirit
      };
      formData.forEach((value, key) => {
        // Try to parse JSON values from the FormData
        if (key === 'nose' || key === 'palate' || key === 'finish') {
          try {
            jsonData[key] = JSON.parse(value as string);
          } catch {
            jsonData[key] = value;
          }
        } else if (key === 'isFavorite') {
          jsonData[key] = value === 'true';
        } else if (key === 'proof' || key === 'price' || key === 'rating' || key === 'bottleLevel' || key === 'releaseYear') {
          const numValue = parseFloat(value as string);
          jsonData[key] = isNaN(numValue) ? null : numValue;
        } else {
          jsonData[key] = value;
        }
      });
      
      // Add user ID as ownerId
      jsonData.ownerId = session.user.id; // Ensure ownerId is set, API also does this but good practice
      // jsonData.userId = session.user.id; // Remove or ensure this doesn't conflict if API relies on it
      
      console.log('Sending JSON data:', jsonData);
      
      const response = await fetch('/api/collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Server response:', responseData);
        throw new Error(responseData.error || 'Failed to add spirit');
      }

      // Revalidate data with SWR
      await mutate();
      setIsFormVisible(false); // Hide form after successful submission
      toast('Spirit added successfully', { icon: '✅' });
      return responseData;
    } catch (error) {
      console.error('Failed to add spirit:', error);
      toast('Failed to add spirit', { icon: '❌' });
      throw error;
    } finally {
      setIsManualLoading(false);
    }
  };

  const handleDeleteSpirit = async (id: string) => {
    try {
      console.log(`Attempting to delete spirit with ID: ${id}`);
      
      const response = await fetch(`/api/collection/${id}`, {
        method: 'DELETE',
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Server response:', responseData);
        throw new Error(responseData.error || 'Failed to delete spirit');
      }

      // Update the cache using SWR's mutate
      mutate(current => {
        if (!current) return current; // Return current (undefined) if no data to update
        
        const updatedSpirits = current.spirits.filter((spirit: Spirit) => spirit.id !== id);
        const newTotalItems = current.totalItems > 0 ? current.totalItems - 1 : 0;
        // totalPages will be fully accurate on re-fetch. For optimistic UI, this is a reasonable state.
        return {
          ...current,
          spirits: updatedSpirits,
          totalItems: newTotalItems,
          // Potentially recalculate totalPages if it's critical for optimistic UI, otherwise let SWR handle it:
          // totalPages: Math.ceil(newTotalItems / ITEMS_PER_PAGE), 
        };
      }, false); // false means don't revalidate

      toast('Spirit removed successfully', { icon: '✅' });
    } catch (error) {
      console.error('Failed to delete spirit:', error);
      toast('Failed to remove spirit', { icon: '❌' });
    }
  };

  // Combine loading states
  const isLoading = isSWRLoading || status === 'loading' || isManualLoading;

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

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
      <div className="relative z-20">
        {/* Header Section */}
        <div className="relative bg-transparent backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/20"></div>
          {/* Decorative elements */}
          <div className="absolute right-0 top-0 h-full w-1/3 overflow-hidden">
            <div className="absolute -right-10 top-10 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl"></div>
            <div className="absolute right-40 bottom-5 w-32 h-32 rounded-full bg-amber-500/20 blur-xl"></div>
          </div>
          <div className="container mx-auto px-4 py-16 pt-28 relative">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {session?.user?.name ? `${session.user.name}'s Collection` : 'Collection'}
            </h1>
            <p className="text-gray-200 text-lg max-w-2xl">
              Track and manage your favorite spirits, add tasting notes, and rate your collection.
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="container mx-auto px-4 py-12 relative">
          {/* Decorative blurred circles */}
          <div className="absolute -left-20 top-40 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none opacity-30"></div>
          <div className="absolute right-10 bottom-20 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none opacity-20"></div>
          
          {/* Form Section - Collapsible */}
          <div className="mb-8">
            <button 
              onClick={() => setIsFormVisible(!isFormVisible)}
              className="w-full flex items-center justify-between bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-lg text-white font-semibold transition-all hover:bg-white/15"
            >
              <div className="flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Add to Your Collection
              </div>
              {isFormVisible ? 
                <ChevronUp className="w-5 h-5" /> : 
                <ChevronDown className="w-5 h-5" />
              }
            </button>
            
            {isFormVisible && (
              <div className="mt-2 bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 relative z-10 shadow-xl">
                <AddSpiritForm onAdd={handleAddSpirit} />
              </div>
            )}
          </div>

          {/* Filter Section */}
          <div className="mb-8 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg">
            <h3 className="text-xl font-semibold text-white mb-4">Filter Collection</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="filterName" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input type="text" id="filterName" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Filter by name" className="w-full bg-white/10 border-white/20 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="filterType" className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                <select id="filterType" value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full bg-white/10 border-white/20 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm">
                  <option value="">All Types</option>
                  {/* Dynamic options removed for now; API should provide these or fetch separately */}
                  {/* Example static options: */}
                  <option value="Whiskey">Whiskey</option>
                  <option value="Bourbon">Bourbon</option>
                  <option value="Scotch">Scotch</option>
                  <option value="Rye">Rye</option>
                  <option value="Rum">Rum</option>
                  <option value="Gin">Gin</option>
                  <option value="Vodka">Vodka</option>
                  <option value="Tequila">Tequila</option>
                  <option value="Mezcal">Mezcal</option>
                  <option value="Brandy">Brandy</option>
                  <option value="Liqueur">Liqueur</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="filterPriceMin" className="block text-sm font-medium text-gray-300 mb-1">Min Price</label>
                <input type="number" id="filterPriceMin" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)} placeholder="Min" className="w-full bg-white/10 border-white/20 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="filterPriceMax" className="block text-sm font-medium text-gray-300 mb-1">Max Price</label>
                <input type="number" id="filterPriceMax" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)} placeholder="Max" className="w-full bg-white/10 border-white/20 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="filterCountry" className="block text-sm font-medium text-gray-300 mb-1">Country</label>
                <select id="filterCountry" value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="w-full bg-white/10 border-white/20 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm">
                  <option value="">All Countries</option>
                  {/* Dynamic options removed; consider fetching these from an API endpoint or adding statically */}
                  <option value="USA">USA</option>
                  <option value="Scotland">Scotland</option>
                  <option value="Ireland">Ireland</option>
                  <option value="Canada">Canada</option>
                  <option value="Japan">Japan</option>
                </select>
              </div>
              <div>
                <label htmlFor="filterRegion" className="block text-sm font-medium text-gray-300 mb-1">Region</label>
                <select id="filterRegion" value={filterRegion} onChange={e => setFilterRegion(e.target.value)} className="w-full bg-white/10 border-white/20 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm">
                  <option value="">All Regions</option>
                  {/* Dynamic options removed; consider fetching these from an API endpoint or adding statically */}
                  <option value="Kentucky">Kentucky (USA)</option>
                  <option value="Tennessee">Tennessee (USA)</option>
                  <option value="Highlands">Highlands (Scotland)</option>
                  <option value="Islay">Islay (Scotland)</option>
                  <option value="Speyside">Speyside (Scotland)</option>
                </select>
              </div>
              <div>
                <label htmlFor="filterProofMin" className="block text-sm font-medium text-gray-300 mb-1">Min Proof</label>
                <input type="number" id="filterProofMin" value={filterProofMin} onChange={e => setFilterProofMin(e.target.value)} placeholder="Min Proof" className="w-full bg-white/10 border-white/20 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="filterProofMax" className="block text-sm font-medium text-gray-300 mb-1">Max Proof</label>
                <input type="number" id="filterProofMax" value={filterProofMax} onChange={e => setFilterProofMax(e.target.value)} placeholder="Max Proof" className="w-full bg-white/10 border-white/20 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
              </div>
            </div>
          </div>

          {/* Collection Section */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">Your Spirits</h2>
              <div className="flex gap-2 items-center">
                <label htmlFor="sortBy" className="text-sm font-medium text-gray-300">Sort by:</label>
                <select 
                  id="sortBy" 
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortableField)}
                  className="bg-white/10 border-white/20 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                >
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                  <option value="rating">Rating</option>
                  <option value="createdAt">Date Added (Newest/Oldest)</option>
                  <option value="proof">Proof</option>
                </select>
                <button 
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 bg-white/10 border-white/20 rounded-md text-white hover:bg-white/15 transition-colors"
                  aria-label={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
                >
                  {sortOrder === 'asc' ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 text-center bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="w-12 h-12 border-t-2 border-amber-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-300">Loading your collection...</p>
              </div>
            ) : error ? (
              <FetchErrorComponent 
                error={error} 
                onRetry={() => mutate()} 
              />
            ) : spirits.length === 0 && !isSWRLoading ? (
              <div className="text-center py-20 border border-dashed border-white/20 rounded-lg bg-white/5 backdrop-blur-sm">
                <p className="text-xl text-gray-200 mb-4">Your collection is empty</p>
                <p className="text-gray-400">Add your first spirit using the form above, or adjust your filters.</p>
                {!isFormVisible && (
                  <button 
                    onClick={() => setIsFormVisible(true)}
                    className="mt-6 bg-amber-500 hover:bg-amber-600 text-white py-2 px-4 rounded-md transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Add Spirit
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {paginatedSpirits.map((spirit) => (
                  <SpiritCard
                    key={spirit.id}
                    spirit={spirit}
                    onDelete={handleDeleteSpirit}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-4 text-white">
                <button 
                  onClick={handlePreviousPage} 
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white/10 border-white/20 rounded-md hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white/10 border-white/20 rounded-md hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 