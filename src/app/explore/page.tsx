'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { 
  Search, Filter, User, ChevronDown, Star, Wine, X, 
  SlidersHorizontal, Users, TrendingUp, Flame, Tag
} from 'lucide-react';
import { motion } from 'framer-motion';

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
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
}

// Filter types
type SortOption = 'popular' | 'newest' | 'highest_rated';
type FilterOptions = {
  type: string | null;
  minRating: number;
  maxUsers: number | null;
  sort: SortOption;
}

// Dropdown component to reuse for filters
const FilterDropdown = ({ 
  label, 
  options, 
  value, 
  onChange 
}: { 
  label: string; 
  options: {value: string | number | null, label: string}[]; 
  value: string | number | null; 
  onChange: (value: any) => void 
}) => {
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
        className="flex items-center justify-between w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white hover:border-amber-500 transition-all"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md ${value === option.value ? 'bg-amber-600 text-white' : 'hover:bg-gray-700 text-gray-300'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function ExplorePage() {
  const { data: session, status } = useSession({ required: true });
  const [loading, setLoading] = useState(true);
  const [popularUsers, setPopularUsers] = useState<CollectionUser[]>([]);
  const [featuredSpirits, setFeaturedSpirits] = useState<SpiritPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    type: null,
    minRating: 0,
    maxUsers: null,
    sort: 'popular'
  });
  
  const spiritTypes = [
    'Bourbon',
    'Rye',
    'Scotch',
    'Irish',
    'Japanese',
    'Canadian',
    'Other Whiskey',
  ];
  
  const sortOptions = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'newest', label: 'Newest First' },
    { value: 'highest_rated', label: 'Highest Rated' }
  ];
  
  const maxUsersOptions = [
    { value: null, label: 'Any Size' },
    { value: 10, label: '≤ 10 Tasters' },
    { value: 5, label: '≤ 5 Tasters' },
    { value: 3, label: '≤ 3 Tasters' },
    { value: 1, label: 'Solo Tastings' },
  ];

  // Fetch popular collections and featured spirits
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);

        // Fetch popular users with collections
        const usersResponse = await fetch('/api/users/popular');
        if (!usersResponse.ok) {
          throw new Error('Failed to fetch popular users');
        }
        const usersData = await usersResponse.json();
        setPopularUsers(usersData.users || []);

        // Fetch featured spirits
        const spiritsResponse = await fetch('/api/spirits/featured');
        if (!spiritsResponse.ok) {
          throw new Error('Failed to fetch featured spirits');
        }
        const spiritsData = await spiritsResponse.json();
        setFeaturedSpirits(spiritsData.spirits || []);
      } catch (error) {
        console.error('Error fetching collections:', error);
        toast.error('Failed to load collections');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchCollections();
    }
  }, [session]);

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
    
    // Max users filter would be applied here if we had the data
    // For now, we'll assume all match
    const matchesMaxUsers = true;
    
    return matchesSearch && matchesType && matchesRating && matchesMaxUsers;
  });
  
  // Sort filtered spirits based on sort option
  const sortedSpirits = [...filteredSpirits].sort((a, b) => {
    switch (filters.sort) {
      case 'highest_rated':
        return (b.rating || 0) - (a.rating || 0);
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
  
  // Handle max users filter change
  const handleMaxUsersChange = (maxUsers: number | null) => {
    setFilters(prev => ({ ...prev, maxUsers }));
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
      maxUsers: null,
      sort: 'popular'
    });
  };

  const activeFiltersCount = 
    (filters.type ? 1 : 0) + 
    (filters.minRating > 0 ? 1 : 0) + 
    (filters.maxUsers !== null ? 1 : 0) +
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
    <div className="container mx-auto px-4 py-8">
      {/* Header with floating search bar */}
      <div className="relative mb-12">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="text-4xl font-bold text-white mb-3 text-center">Explore Bourbon Collections</h1>
          <p className="text-gray-400 text-center max-w-xl mx-auto mb-6">
            Discover unique spirits and collections from the bourbon community
          </p>
          
          <div className="relative w-full max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-12 py-3 border border-gray-700 rounded-full bg-gray-800/70 backdrop-blur-sm text-white focus:ring-amber-500 focus:border-amber-500 shadow-lg"
              placeholder="Search by name, brand, or collector..."
              value={searchQuery}
              onChange={handleSearch}
            />
            <div className="absolute inset-y-0 right-3 flex items-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center p-2 rounded-full ${showFilters ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} transition-colors relative`}
              >
                <SlidersHorizontal className="h-5 w-5" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Animated filter panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-30 bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-lg p-5 mb-8 border border-gray-700"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Filter className="h-5 w-5 mr-2 text-amber-500" />
              Filters & Sort
            </h3>
            <button 
              onClick={handleResetFilters}
              className="text-sm text-amber-500 hover:text-amber-400 flex items-center"
            >
              <X className="h-4 w-4 mr-1" />
              Reset All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Spirit Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                <Wine className="h-4 w-4 mr-1" />
                Spirit Type
              </label>
              <FilterDropdown
                label={filters.type || "All Types"}
                options={[
                  { value: null, label: 'All Types' },
                  ...spiritTypes.map(type => ({ value: type, label: type }))
                ]}
                value={filters.type}
                onChange={handleFilterTypeChange}
              />
            </div>
            
            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                <Star className="h-4 w-4 mr-1 fill-amber-500 text-amber-500" />
                Min Rating
              </label>
              <div className="flex space-x-2 items-center">
                {[0, 1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleRatingChange(rating)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
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
            
            {/* Max Users Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Tasting Size
              </label>
              <FilterDropdown
                label={
                  filters.maxUsers === null 
                    ? "Any Size" 
                    : filters.maxUsers === 1 
                      ? "Solo Tastings" 
                      : `≤ ${filters.maxUsers} Tasters`
                }
                options={maxUsersOptions}
                value={filters.maxUsers}
                onChange={handleMaxUsersChange}
              />
            </div>
            
            {/* Sort Option */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                Sort By
              </label>
              <FilterDropdown
                label={sortOptions.find(o => o.value === filters.sort)?.label || "Most Popular"}
                options={sortOptions}
                value={filters.sort}
                onChange={handleSortChange}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Popular Collectors */}
      <section className="relative z-20 mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Flame className="h-5 w-5 mr-2 text-amber-500" />
            Popular Collectors
          </h2>
          <Link 
            href="/collectors"
            className="text-amber-500 hover:text-amber-400 text-sm font-medium"
          >
            View All
          </Link>
        </div>
        
        {popularUsers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {popularUsers.map(user => (
              <Link 
                href={`/users/${user.id}`} 
                key={user.id}
                className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    {user.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.name}
                        fill
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{user.name}</h3>
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
                  className="bg-gray-800/70 backdrop-blur-sm rounded-xl overflow-hidden transition-all border border-gray-700/50 hover:border-amber-500/50 shadow-lg h-full"
                >
                  <div className="relative h-48">
                    {spirit.imageUrl ? (
                      <Image
                        src={spirit.imageUrl}
                        alt={spirit.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-amber-800/30">
                        <Wine className="h-12 w-12 text-amber-700/50" />
                      </div>
                    )}
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
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/90 to-transparent h-1/3"></div>
                  </div>
                  <div className="p-5">
                    <div>
                      <div className="inline-block bg-amber-600/20 text-amber-500 text-xs font-medium rounded-full px-2 py-1 mb-2">
                        {spirit.type}
                      </div>
                      <h3 className="font-bold text-white text-lg">{spirit.name}</h3>
                      <p className="text-amber-500">{spirit.brand}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-700 flex items-center">
                      <div className="w-6 h-6 rounded-full bg-gray-700 overflow-hidden relative mr-2">
                        {spirit.ownerAvatar ? (
                          <Image 
                            src={spirit.ownerAvatar} 
                            alt={spirit.ownerName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-amber-600 text-white text-xs font-bold">
                            {spirit.ownerName[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">
                        @{spirit.ownerName}
                      </span>
                      <div className="ml-auto flex items-center text-amber-500 text-sm">
                        <Wine className="h-4 w-4 mr-1" />
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
            <p className="text-gray-400 mb-2">No spirits found matching your criteria</p>
            {(searchQuery || activeFiltersCount > 0) && (
              <button
                onClick={handleResetFilters}
                className="text-amber-500 hover:text-amber-400 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
} 