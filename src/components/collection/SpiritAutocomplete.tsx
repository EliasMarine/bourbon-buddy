'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Info } from 'lucide-react';

export interface SpiritInfo {
  name: string;
  distillery: string;
  type: string;
  proof: number | null;
  price: number | null;
  releaseYear: number | null;
  description: string | null;
  imageUrl: string | null;
}

interface SpiritAutocompleteProps {
  onSpiritSelect: (spirit: SpiritInfo) => void;
  onInputChange: (value: string) => void;
  value: string;
  isLoading?: boolean;
}

export default function SpiritAutocomplete({
  onSpiritSelect,
  onInputChange,
  value,
  isLoading = false
}: SpiritAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<SpiritInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const lastSearchRef = useRef<string>('');

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const searchSpirits = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setMessage(null);
      return;
    }
    
    // Skip if the query is the same as the last search
    if (searchQuery === lastSearchRef.current) {
      return;
    }
    
    // Store current search query
    lastSearchRef.current = searchQuery;
    
    try {
      setSearchLoading(true);
      setMessage(null);
      
      // Check if the query is just a type without a specific spirit name
      const commonTypes = ['bourbon', 'rye', 'scotch', 'whiskey', 'whisky', 'tequila', 'rum', 'gin', 'vodka'];
      if (commonTypes.includes(searchQuery.toLowerCase()) && searchQuery.length < 10) {
        setMessageType('info');
        setMessage("Try adding a brand name or specific bottle for better results");
      }
      
      const response = await fetch(`/api/spirits/search?query=${encodeURIComponent(searchQuery)}`);
      
      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if we have results
      if (data.spirits && data.spirits.length > 0) {
        // Show the first few results with the most relevant ones first
        setSuggestions(data.spirits);
        setIsOpen(true);
        
        // If we have a message from the API, display it
        if (data.message) {
          setMessageType('info');
          setMessage(data.message);
        } else if (data.spirits.length === 1) {
          // Only one result - exact match!
          setMessageType('success');
          setMessage('Found exact match!');
        } else {
          setMessage(null);
        }
      } else {
        setSuggestions([]);
        setMessageType('warning');
        
        if (data.message) {
          setMessage(data.message);
        } else {
          // Provide helpful guidance for no results
          if (searchQuery.length < 4) {
            setMessage('Your search is too short. Try entering more characters.');
          } else if (/^\d+$/.test(searchQuery)) {
            setMessage('Try adding a brand name instead of just numbers.');
          } else {
            setMessage(`No spirits found for "${searchQuery}". Try a different search term.`);
          }
        }
        
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Error fetching spirit suggestions:', error);
      setSuggestions([]);
      setMessageType('error');
      setMessage('An error occurred while searching. Please try again.');
      setIsOpen(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onInputChange(value);
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer to search after user stops typing
    debounceTimerRef.current = setTimeout(() => {
      searchSpirits(value);
    }, 500);
  };

  const handleSuggestionClick = (spirit: SpiritInfo) => {
    setQuery(spirit.name);
    onSpiritSelect(spirit);
    setIsOpen(false);
    setMessage(null);
  };

  const clearInput = () => {
    setQuery('');
    onInputChange('');
    setSuggestions([]);
    setIsOpen(false);
    setMessage(null);
    lastSearchRef.current = '';
  };

  // Format price to display properly
  const formatPrice = (price: number | null): string => {
    if (price === null) return 'Price unknown';
    return `$${price.toFixed(2)}`;
  };

  // Get the right message color based on type
  const getMessageColorClass = () => {
    switch (messageType) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-amber-400';
    }
  };

  return (
    <div className="relative" ref={autocompleteRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          className="mt-0 block w-full px-3 py-2 pl-10 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500"
          placeholder="Search for spirits (bourbon, rye, scotch, etc.)"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        {query && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>
      
      {(isLoading || searchLoading) && (
        <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
          <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
        </div>
      )}
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 rounded-md shadow-lg border border-gray-700 max-h-80 overflow-auto">
          {message && (
            <div className={`px-4 py-3 text-sm ${getMessageColorClass()} border-b border-gray-700 flex items-center gap-2`}>
              <Info className="h-4 w-4 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}
          
          {suggestions.map((spirit, index) => (
            <div
              key={index}
              className="px-4 py-3 hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-700 last:border-0"
              onClick={() => handleSuggestionClick(spirit)}
            >
              <div className="flex items-start gap-3">
                {spirit.imageUrl && (
                  <div className="flex-shrink-0 w-12 h-12 bg-black/30 rounded overflow-hidden">
                    <img 
                      src={spirit.imageUrl.startsWith('http') ? `/api/proxy/image?url=${encodeURIComponent(spirit.imageUrl)}` : spirit.imageUrl}
                      alt={spirit.name}
                      className="w-full h-full object-contain" 
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <span className="font-medium text-white text-sm sm:text-base truncate">{spirit.name}</span>
                    {spirit.proof && (
                      <span className="text-gray-400 text-xs whitespace-nowrap ml-2">{spirit.proof} Proof</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mt-1 text-xs sm:text-sm">
                    <span className="text-gray-300 truncate">{spirit.distillery}</span>
                    <div className="flex flex-wrap gap-x-3 mt-1 sm:mt-0">
                      <span className="text-amber-400 whitespace-nowrap">{spirit.type}</span>
                      {spirit.price && (
                        <span className="text-gray-400 whitespace-nowrap">{formatPrice(spirit.price)}</span>
                      )}
                      {spirit.releaseYear && (
                        <span className="text-gray-400 whitespace-nowrap">{spirit.releaseYear}</span>
                      )}
                    </div>
                  </div>
                  {spirit.description && (
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2">{spirit.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {suggestions.length === 0 && !message && (
            <div className="px-4 py-3 text-gray-400 text-sm">
              No spirits found. Try a different search term.
            </div>
          )}
        </div>
      )}
    </div>
  );
} 