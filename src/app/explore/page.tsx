'use client';

import { useState, useEffect } from 'react';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { 
  Search, Filter, User, ChevronDown, Star, Wine, X, 
  SlidersHorizontal, Users, TrendingUp, Flame, Tag,
  DollarSign, Percent, Gauge, RefreshCw, ArrowRight
} from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';

interface CollectionUser {
  id: string;
  name: string;
  avatar?: string;
  spiritsCount: number;
}

interface SpiritPreview {
  id: string;
  name: string;
  brand: string;
  type: string;
  imageUrl?: string;
  rating?: number;
  price?: number;
  proof?: number;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  viewers?: number;
}

// Filter types
type SortOption = 'popular' | 'newest' | 'highest_rated' | 'price_low' | 'price_high' | 'proof_high' | 'proof_low';
type FilterOptions = {
  type: string | null;
  minRating: number;
  maxViewers: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  minProof: number | null;
  maxProof: number | null;
  sort: SortOption;
}

// Dropdown component with improved styling
function FilterDropdown({ 
  label, 
  options, 
  value, 
  onChange,
  icon
}: { 
  label: string; 
  options: {value: string | number | null, label: string}[]; 
  value: string | number | null; 
  onChange: (value: any) => void;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.filter-dropdown')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);
  
  return (
    <div className="relative filter-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-lg text-white hover:border-amber-500 transition-all shadow-sm"
      >
        <span className="flex items-center gap-2">
          {icon}
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${value === option.value ? 'bg-amber-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Range slider component for price and proof
function RangeFilter({
  title,
  minValue,
  maxValue,
  currentMin,
  currentMax,
  step,
  onChange,
  icon,
  prefix = '',
  suffix = ''
}: {
  title: string;
  minValue: number;
  maxValue: number;
  currentMin: number | null;
  currentMax: number | null;
  step: number;
  onChange: (min: number | null, max: number | null) => void;
  icon: React.ReactNode;
  prefix?: string;
  suffix?: string;
}) {
  const [localMin, setLocalMin] = useState<number>(currentMin || minValue);
  const [localMax, setLocalMax] = useState<number>(currentMax || maxValue);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setLocalMin(value);
    onChange(value, localMax);
  };
  
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setLocalMax(value);
    onChange(localMin, value);
  };
  
  const handleReset = () => {
    setLocalMin(minValue);
    setLocalMax(maxValue);
    onChange(null, null);
  };
  
  const isActive = (currentMin !== null && currentMin > minValue) || 
                   (currentMax !== null && currentMax < maxValue);
  
  return (
    <div className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center justify-between w-full px-4 py-2.5 bg-gray-800/70 backdrop-blur-sm border rounded-lg text-white transition-all shadow-sm ${isActive ? 'border-amber-500' : 'border-gray-700 hover:border-amber-500/50'}`}
      >
        <span className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
          {isActive && (
            <span className="bg-amber-600/20 text-amber-500 text-xs px-2 py-0.5 rounded-full ml-1">
              Active
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      
      {isExpanded && (
        <div className="mt-2 p-4 bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-md">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-300">
              {prefix}{localMin}{suffix}
            </span>
            <span className="text-sm text-gray-300">
              {prefix}{localMax}{suffix}
            </span>
          </div>
          
          <div className="relative mb-4 h-2 bg-gray-700 rounded">
            <div 
              className="absolute h-2 bg-amber-600 rounded"
              style={{
                left: `${((localMin - minValue) / (maxValue - minValue)) * 100}%`,
                right: `${100 - ((localMax - minValue) / (maxValue - minValue)) * 100}%`
              }}
            ></div>
          </div>
          
          <div className="relative mb-6">
            <input
              type="range"
              min={minValue}
              max={maxValue}
              step={step}
              value={localMin}
              onChange={handleMinChange}
              className="absolute w-full appearance-none bg-transparent pointer-events-none"
              style={{
                height: '20px',
                WebkitAppearance: 'none',
                zIndex: 3
              }}
            />
            <input
              type="range"
              min={minValue}
              max={maxValue}
              step={step}
              value={localMax}
              onChange={handleMaxChange}
              className="absolute w-full appearance-none bg-transparent pointer-events-none"
              style={{
                height: '20px',
                WebkitAppearance: 'none',
                zIndex: 4
              }}
            />
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleReset}
              className="text-amber-500 text-sm hover:text-amber-400 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const { data: session, status } = useSupabaseSession({ required: true });
  const [loading, setLoading] = useState(true);
  const [popularUsers, setPopularUsers] = useState<CollectionUser[]>([]);
  const [featuredSpirits, setFeaturedSpirits] = useState<SpiritPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    type: null,
    minRating: 0,
    maxViewers: null,
    minPrice: null,
    maxPrice: null,
    minProof: null,
    maxProof: null,
    sort: 'popular'
  });
  
  // Enhanced list of all spirit types
  const spiritTypes = [
    'Bourbon',
    'Rye',
    'Scotch',
    'Irish',
    'Japanese',
    'Canadian',
    'Corn',
    'Malt',
    'Tennessee Whiskey',
    'American Whiskey',
    'Blended Whiskey',
    'Single Malt',
    'Wheat Whiskey',
    'White Whiskey',
    'Flavored Whiskey',
    'Rum',
    'Brandy',
    'Cognac',
    'Tequila',
    'Mezcal',
    'Gin',
    'Vodka',
  ];
  
  const sortOptions = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'newest', label: 'Newest First' },
    { value: 'highest_rated', label: 'Highest Rated' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'proof_high', label: 'Proof: Highest First' },
    { value: 'proof_low', label: 'Proof: Lowest First' }
  ];
  
  const maxViewersOptions = [
    { value: null, label: 'Any Size' },
    { value: 10000, label: '≤ 10,000 Viewers' },
    { value: 5000, label: '≤ 5,000 Viewers' },
    { value: 1000, label: '≤ 1,000 Viewers' },
    { value: 500, label: '≤ 500 Viewers' },
    { value: 100, label: '≤ 100 Viewers' },
    { value: 50, label: '≤ 50 Viewers' },
    { value: 10, label: '≤ 10 Viewers' },
    { value: 5, label: '≤ 5 Viewers' },
  ];
  
  // Price range options
  const priceRangeOptions = [
    { value: null, label: 'Any Price' },
    { value: 'under-25', label: 'Under $25' },
    { value: '25-50', label: '$25 - $50' },
    { value: '50-100', label: '$50 - $100' },
    { value: '100-200', label: '$100 - $200' },
    { value: '200-500', label: '$200 - $500' },
    { value: 'over-500', label: 'Over $500' }
  ];
  
  // Proof range options
  const proofRangeOptions = [
    { value: null, label: 'Any Proof' },
    { value: 'under-80', label: 'Under 80 Proof' },
    { value: '80-90', label: '80 - 90 Proof' },
    { value: '90-100', label: '90 - 100 Proof' },
    { value: '100-110', label: '100 - 110 Proof' },
    { value: '110-120', label: '110 - 120 Proof' },
    { value: 'over-120', label: 'Over 120 Proof' }
  ];

  // Fetch popular collections and featured spirits
  useEffect(() => {
    const fetchCollections = async (retryCount = 0) => {
      try {
        setLoading(true);

        // Fetch popular users with collections
        try {
          const usersResponse = await fetch('/api/users/popular');
          
          if (usersResponse.status === 401 && retryCount < 2) {
            console.log('Authentication failed, attempting to sync user...');
            
            // Try to sync the user first
            await fetch('/api/auth/sync-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            console.log('User sync completed, retrying collection fetch...');
            // Wait a moment for the sync to complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try fetching again after sync
            return fetchCollections(retryCount + 1);
          }
          
          if (!usersResponse.ok) {
            throw new Error(`Failed to fetch popular users: ${usersResponse.status}`);
          }
          
          const usersData = await usersResponse.json();
          setPopularUsers(usersData.users || []);
        } catch (error) {
          console.error('Error fetching popular users:', error);
          // Fallback to mock data
          setPopularUsers([
            {
              id: 'user1',
              name: 'Jack Daniels',
              spiritsCount: 24
            },
            {
              id: 'user2',
              name: 'Bourbon Aficionado',
              spiritsCount: 42
            },
            {
              id: 'user3',
              name: 'Whiskey Maven',
              spiritsCount: 36
            },
            {
              id: 'user4',
              name: 'Spirit Hunter',
              spiritsCount: 18
            }
          ]);
        }

        // Fetch featured spirits with proper error handling
        try {
          const spiritsResponse = await fetch('/api/spirits/featured');
          
          if (spiritsResponse.status === 401 && retryCount < 2) {
            console.log('Authentication failed, attempting to sync user...');
            
            // Try to sync the user first (if not already attempted)
            if (retryCount === 0) {
              await fetch('/api/auth/sync-user', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              
              console.log('User sync completed, retrying spirits fetch...');
              // Wait a moment for the sync to complete
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Try fetching again after sync
              return fetchCollections(retryCount + 1);
            }
          }
          
          if (!spiritsResponse.ok) {
            throw new Error(`Failed to fetch featured spirits: ${spiritsResponse.status}`);
          }
          
          const spiritsData = await spiritsResponse.json();
          setFeaturedSpirits(spiritsData.spirits || []);
        } catch (error) {
          console.error('Error fetching featured spirits:', error);
          // Fallback to mock data
          setFeaturedSpirits([
            {
              id: 'spirit1',
              name: 'Eagle Rare 10 Year',
              brand: 'Buffalo Trace',
              type: 'Bourbon',
              rating: 4.5,
              price: 45,
              proof: 90,
              ownerId: 'user1',
              ownerName: 'Jack Daniels',
              viewers: 320
            },
            {
              id: 'spirit2',
              name: 'Blanton\'s Original',
              brand: 'Blanton\'s',
              type: 'Bourbon',
              rating: 4.8,
              price: 65,
              proof: 93,
              ownerId: 'user2',
              ownerName: 'Bourbon Aficionado',
              viewers: 150
            },
            {
              id: 'spirit3',
              name: 'Yamazaki 12 Year',
              brand: 'Suntory',
              type: 'Japanese Whisky',
              rating: 4.7,
              price: 160,
              proof: 86,
              ownerId: 'user3',
              ownerName: 'Whiskey Maven',
              viewers: 420
            },
            {
              id: 'spirit4',
              name: 'Redbreast 12 Year',
              brand: 'Irish Distillers',
              type: 'Irish Whiskey',
              rating: 4.6,
              price: 65,
              proof: 80,
              ownerId: 'user4',
              ownerName: 'Spirit Hunter',
              viewers: 85
            },
            {
              id: 'spirit5',
              name: 'Michter\'s Small Batch',
              brand: 'Michter\'s',
              type: 'Bourbon',
              rating: 4.4,
              price: 50,
              proof: 91.4,
              ownerId: 'user1',
              ownerName: 'Jack Daniels',
              viewers: 230
            },
            {
              id: 'spirit6',
              name: 'Lagavulin 16',
              brand: 'Lagavulin',
              type: 'Scotch',
              rating: 4.9,
              price: 110,
              proof: 86,
              ownerId: 'user2',
              ownerName: 'Bourbon Aficionado',
              viewers: 550
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching collections:', error);
        toast.error('Failed to load collections');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we need to (when status is authenticated or both collections are empty)
    if (status === 'authenticated' && (popularUsers.length === 0 || featuredSpirits.length === 0)) {
      fetchCollections();
    }
  }, [status]); // Only re-run when authentication status changes

  // Filter spirits based on search and filters
  const filteredSpirits = featuredSpirits.filter(spirit => {
    // Search query filter
    const matchesSearch = !searchQuery || 
      spirit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spirit.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spirit.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Spirit type filter
    const matchesType = !filters.type || spirit.type === filters.type;
    
    // Rating filter
    const matchesRating = !spirit.rating || spirit.rating >= filters.minRating;
    
    // Viewers filter
    const matchesViewers = !filters.maxViewers || 
      !spirit.viewers || 
      spirit.viewers <= filters.maxViewers;
    
    // Price filter
    let matchesPrice = true;
    if (filters.minPrice !== null && filters.maxPrice !== null) {
      matchesPrice = !spirit.price || (spirit.price >= filters.minPrice && spirit.price <= filters.maxPrice);
    }
    
    // Proof filter
    let matchesProof = true;
    if (filters.minProof !== null && filters.maxProof !== null) {
      matchesProof = !spirit.proof || (spirit.proof >= filters.minProof && spirit.proof <= filters.maxProof);
    }
    
    return matchesSearch && 
           matchesType && 
           matchesRating && 
           matchesViewers && 
           matchesPrice && 
           matchesProof;
  });
  
  // Sort filtered spirits based on sort option
  const sortedSpirits = [...filteredSpirits].sort((a, b) => {
    switch (filters.sort) {
      case 'highest_rated':
        return (b.rating || 0) - (a.rating || 0);
      case 'price_low':
        return (a.price || 0) - (b.price || 0);
      case 'price_high':
        return (b.price || 0) - (a.price || 0);
      case 'proof_high':
        return (b.proof || 0) - (a.proof || 0);
      case 'proof_low':
        return (a.proof || 0) - (b.proof || 0);
      case 'newest':
        // In a real app, we'd use creation date here
        // For now, just use the existing order
        return 0;
      case 'popular':
      default:
        // In a real app, this would be based on view count or likes
        // For now, higher ratings = more popular
        return (b.rating || 0) - (a.rating || 0);
    }
  });

  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle filter type selection
  const handleFilterTypeChange = (type: string | null) => {
    setFilters(prev => ({ ...prev, type }));
  };
  
  // Handle rating filter change
  const handleRatingChange = (rating: number) => {
    setFilters(prev => ({ ...prev, minRating: rating }));
  };
  
  // Handle max viewers filter change
  const handleMaxViewersChange = (maxViewers: number | null) => {
    setFilters(prev => ({ ...prev, maxViewers }));
  };
  
  // Handle price range filter change
  const handlePriceRangeChange = (range: string | null) => {
    if (range === null) {
      setFilters(prev => ({ ...prev, minPrice: null, maxPrice: null }));
    } else if (range === 'under-25') {
      setFilters(prev => ({ ...prev, minPrice: 0, maxPrice: 25 }));
    } else if (range === '25-50') {
      setFilters(prev => ({ ...prev, minPrice: 25, maxPrice: 50 }));
    } else if (range === '50-100') {
      setFilters(prev => ({ ...prev, minPrice: 50, maxPrice: 100 }));
    } else if (range === '100-200') {
      setFilters(prev => ({ ...prev, minPrice: 100, maxPrice: 200 }));
    } else if (range === '200-500') {
      setFilters(prev => ({ ...prev, minPrice: 200, maxPrice: 500 }));
    } else if (range === 'over-500') {
      setFilters(prev => ({ ...prev, minPrice: 500, maxPrice: 10000 }));
    }
  };
  
  // Get current price range value
  const getCurrentPriceRange = () => {
    if (filters.minPrice === null || filters.maxPrice === null) return null;
    if (filters.minPrice === 0 && filters.maxPrice === 25) return 'under-25';
    if (filters.minPrice === 25 && filters.maxPrice === 50) return '25-50';
    if (filters.minPrice === 50 && filters.maxPrice === 100) return '50-100';
    if (filters.minPrice === 100 && filters.maxPrice === 200) return '100-200';
    if (filters.minPrice === 200 && filters.maxPrice === 500) return '200-500';
    if (filters.minPrice === 500 && filters.maxPrice === 10000) return 'over-500';
    return null;
  };
  
  // Handle proof range filter change
  const handleProofRangeChange = (range: string | null) => {
    if (range === null) {
      setFilters(prev => ({ ...prev, minProof: null, maxProof: null }));
    } else if (range === 'under-80') {
      setFilters(prev => ({ ...prev, minProof: 0, maxProof: 80 }));
    } else if (range === '80-90') {
      setFilters(prev => ({ ...prev, minProof: 80, maxProof: 90 }));
    } else if (range === '90-100') {
      setFilters(prev => ({ ...prev, minProof: 90, maxProof: 100 }));
    } else if (range === '100-110') {
      setFilters(prev => ({ ...prev, minProof: 100, maxProof: 110 }));
    } else if (range === '110-120') {
      setFilters(prev => ({ ...prev, minProof: 110, maxProof: 120 }));
    } else if (range === 'over-120') {
      setFilters(prev => ({ ...prev, minProof: 120, maxProof: 200 }));
    }
  };
  
  // Get current proof range value
  const getCurrentProofRange = () => {
    if (filters.minProof === null || filters.maxProof === null) return null;
    if (filters.minProof === 0 && filters.maxProof === 80) return 'under-80';
    if (filters.minProof === 80 && filters.maxProof === 90) return '80-90';
    if (filters.minProof === 90 && filters.maxProof === 100) return '90-100';
    if (filters.minProof === 100 && filters.maxProof === 110) return '100-110';
    if (filters.minProof === 110 && filters.maxProof === 120) return '110-120';
    if (filters.minProof === 120 && filters.maxProof === 200) return 'over-120';
    return null;
  };
  
  // Handle sort option change
  const handleSortChange = (sort: SortOption) => {
    setFilters(prev => ({ ...prev, sort: sort as SortOption }));
  };
  
  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilters({
      type: null,
      minRating: 0,
      maxViewers: null,
      minPrice: null,
      maxPrice: null,
      minProof: null,
      maxProof: null,
      sort: 'popular'
    });
  };

  const activeFiltersCount = 
    (filters.type ? 1 : 0) + 
    (filters.minRating > 0 ? 1 : 0) + 
    (filters.maxViewers !== null ? 1 : 0) +
    ((filters.minPrice !== null || filters.maxPrice !== null) ? 1 : 0) +
    ((filters.minProof !== null || filters.maxProof !== null) ? 1 : 0) +
    (filters.sort !== 'popular' ? 1 : 0);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center h-48">
          <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-amber-500 animate-spin"></div>
          <p className="mt-4 text-gray-400">Loading collections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero background with gradient overlay */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/90 via-gray-900/80 to-gray-900"></div>
        <div className="relative z-10 pt-12 pb-24">
          <div className="container mx-auto px-4">
            {/* Header with floating search bar */}
            <div className="relative mb-16">
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-3xl mx-auto"
              >
                <h1 className="text-5xl font-bold text-white mb-4 text-center">Explore Spirits</h1>
                <p className="text-gray-300 text-center max-w-xl mx-auto mb-8 text-lg">
                  Discover unique spirits and collections from the bourbon community
                </p>
                
                <div className="relative w-full max-w-2xl mx-auto">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-12 pr-12 py-3.5 border border-gray-700 rounded-full bg-gray-800/80 backdrop-blur-sm text-white focus:ring-amber-500 focus:border-amber-500 shadow-lg transition-all"
                    placeholder="Search by name, brand, or collector..."
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center justify-center p-2 rounded-full transition-colors relative ${showFilters ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      aria-label="Toggle filters"
                    >
                      <SlidersHorizontal className="h-5 w-5" />
                      {activeFiltersCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 -mt-16 mb-16 relative z-20">
        {/* Animated filter panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="relative z-30 bg-gray-800/90 backdrop-blur-md rounded-xl shadow-xl p-6 mb-8 border border-gray-700"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <Filter className="h-5 w-5 mr-2 text-amber-500" />
                Filters & Sort
              </h3>
              <button 
                onClick={handleResetFilters}
                className="text-sm text-amber-500 hover:text-amber-400 flex items-center px-3 py-1.5 bg-amber-500/10 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reset All
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Spirit Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Wine className="h-4 w-4 mr-1 text-amber-500" />
                  Spirit Type
                </label>
                <FilterDropdown
                  label={filters.type || "All Spirit Types"}
                  options={[
                    { value: null, label: 'All Spirit Types' },
                    ...spiritTypes.map(type => ({ value: type, label: type }))
                  ]}
                  value={filters.type}
                  onChange={handleFilterTypeChange}
                  icon={<Wine className="h-4 w-4 text-amber-500" />}
                />
              </div>
              
              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Star className="h-4 w-4 mr-1 text-amber-500" />
                  Min Rating
                </label>
                <div className="flex space-x-2 items-center bg-gray-800/70 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-gray-700">
                  {[0, 1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRatingChange(rating)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                        filters.minRating === rating
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Max Viewers Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-1 text-amber-500" />
                  Room Size
                </label>
                <FilterDropdown
                  label={
                    filters.maxViewers === null 
                      ? "Any Size" 
                      : `≤ ${filters.maxViewers.toLocaleString()} Viewers`
                  }
                  options={maxViewersOptions}
                  value={filters.maxViewers}
                  onChange={handleMaxViewersChange}
                  icon={<Users className="h-4 w-4 text-amber-500" />}
                />
              </div>
              
              {/* Price Range Filter as Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <DollarSign className="h-4 w-4 mr-1 text-amber-500" />
                  Price Range
                </label>
                <FilterDropdown
                  label={priceRangeOptions.find(o => o.value === getCurrentPriceRange())?.label || "Any Price"}
                  options={priceRangeOptions}
                  value={getCurrentPriceRange()}
                  onChange={handlePriceRangeChange}
                  icon={<DollarSign className="h-4 w-4 text-amber-500" />}
                />
              </div>
              
              {/* Proof Range Filter as Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <Percent className="h-4 w-4 mr-1 text-amber-500" />
                  Proof Range
                </label>
                <FilterDropdown
                  label={proofRangeOptions.find(o => o.value === getCurrentProofRange())?.label || "Any Proof"}
                  options={proofRangeOptions}
                  value={getCurrentProofRange()}
                  onChange={handleProofRangeChange}
                  icon={<Gauge className="h-4 w-4 text-amber-500" />}
                />
              </div>
              
              {/* Sort Option */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1 text-amber-500" />
                  Sort By
                </label>
                <FilterDropdown
                  label={sortOptions.find(o => o.value === filters.sort)?.label || "Most Popular"}
                  options={sortOptions}
                  value={filters.sort}
                  onChange={handleSortChange}
                  icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Popular Collectors */}
        <section className="relative z-20 mb-12 bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/40 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Flame className="h-5 w-5 mr-2 text-amber-500" />
              Popular Collectors
            </h2>
            <Link 
              href="/collectors"
              className="text-amber-500 hover:text-amber-400 text-sm font-medium px-4 py-1.5 bg-amber-500/10 rounded-lg transition-colors flex items-center"
            >
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          {popularUsers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {popularUsers.map(user => (
                <Link 
                  href={`/users/${user.id}`} 
                  key={user.id}
                  className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 hover:bg-gray-700/70 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 border border-gray-700/50 hover:border-amber-500/20 group"
                >
                  <div className="flex items-center gap-4">
                    <UserAvatar
                      src={user.avatar}
                      name={user.name}
                      size={64}
                    />
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-amber-500 transition-colors">{user.name}</h3>
                      <p className="text-gray-400">{user.spiritsCount} spirits</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 text-center border border-gray-700/50">
              <p className="text-gray-400">No collectors found</p>
            </div>
          )}
        </section>

        {/* Featured Spirits */}
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Tag className="h-5 w-5 mr-2 text-amber-500" />
              Featured Spirits
              {sortedSpirits.length > 0 && (
                <span className="ml-3 text-sm font-normal text-gray-400">
                  {sortedSpirits.length} results
                </span>
              )}
            </h2>
          </div>
          
          {sortedSpirits.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedSpirits.map(spirit => (
                <Link 
                  key={spirit.id} 
                  href={`/spirits/${spirit.id}`}
                >
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="bg-gray-800/70 backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-300 border border-gray-700/50 hover:border-amber-500/30 shadow-lg h-full group"
                  >
                    <div className="relative h-56">
                      {spirit.imageUrl ? (
                        <Image
                          src={spirit.imageUrl}
                          alt={spirit.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-amber-900/20">
                          <Wine className="h-16 w-16 text-amber-700/50" />
                        </div>
                      )}
                      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
                        <div className="inline-block bg-amber-600/20 text-amber-500 text-xs font-medium rounded-full px-2 py-1">
                          {spirit.type}
                        </div>
                      </div>
                      <div className="absolute top-3 right-3 px-2 py-1 bg-gray-900/80 backdrop-blur-sm rounded-lg flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              spirit.rating && i < spirit.rating
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-gray-500'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/95 via-gray-900/70 to-transparent h-1/2"></div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-white text-xl group-hover:text-amber-500 transition-colors mb-1">{spirit.name}</h3>
                      <p className="text-amber-500 mb-3">{spirit.brand}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {spirit.price && (
                          <div className="bg-gray-700/50 text-gray-300 text-xs font-medium rounded-full px-2 py-1 flex items-center">
                            <DollarSign className="w-3 h-3 mr-1" />
                            ${spirit.price}
                          </div>
                        )}
                        {spirit.proof && (
                          <div className="bg-gray-700/50 text-gray-300 text-xs font-medium rounded-full px-2 py-1 flex items-center">
                            <Percent className="w-3 h-3 mr-1" />
                            {spirit.proof} Proof
                          </div>
                        )}
                        {spirit.viewers && (
                          <div className="bg-gray-700/50 text-gray-300 text-xs font-medium rounded-full px-2 py-1 flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {spirit.viewers.toLocaleString()} Viewers
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-gray-700 flex items-center">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            src={spirit.ownerAvatar}
                            name={spirit.ownerName}
                            size={24}
                          />
                          <span className="text-sm text-gray-400">
                            @{spirit.ownerName}
                          </span>
                        </div>
                        <div className="ml-auto text-amber-500 text-sm group-hover:translate-x-1 transition-transform">
                          View Details
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 text-center border border-gray-700/50">
              <p className="text-gray-300 mb-2">No spirits found matching your criteria</p>
              {(searchQuery || activeFiltersCount > 0) && (
                <button
                  onClick={handleResetFilters}
                  className="text-amber-500 hover:text-amber-400 font-medium flex items-center mx-auto mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
} 