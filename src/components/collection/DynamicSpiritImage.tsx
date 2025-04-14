'use client';

import React, { useState, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';
import { getSafeImageUrl, dynamicImageSearch } from '@/lib/spiritUtils';
import SafeImage from '@/components/ui/SafeImage';

interface DynamicSpiritImageProps {
  name: string;
  brand: string;
  imageUrl?: string | null;
  webImageUrl?: string | null;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function DynamicSpiritImage({
  name,
  brand,
  imageUrl,
  webImageUrl,
  className,
  width = 200,
  height = 300,
  priority = false
}: DynamicSpiritImageProps) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading state
  const [loadError, setLoadError] = useState(false);
  const [attemptedDynamicSearch, setAttemptedDynamicSearch] = useState(false);
  
  // First check existing URLs
  useEffect(() => {
    // Check if we have any direct URLs to use
    if (imageUrl) {
      const safeUrl = getSafeImageUrl(imageUrl);
      if (!safeUrl.includes('bottle-placeholder')) {
        setDisplayUrl(safeUrl);
        setIsLoading(false);
        return;
      }
    }
    
    if (webImageUrl) {
      const safeWebUrl = getSafeImageUrl(webImageUrl);
      if (!safeWebUrl.includes('bottle-placeholder')) {
        setDisplayUrl(safeWebUrl);
        setIsLoading(false);
        return;
      }
    }
    
    // If we reach here, we need to try dynamic search
    if (!attemptedDynamicSearch) {
      setAttemptedDynamicSearch(true);
    }
  }, [imageUrl, webImageUrl, attemptedDynamicSearch]);
  
  // Dynamic image search if needed
  useEffect(() => {
    let isMounted = true;
    
    const fetchDynamicImage = async () => {
      if (attemptedDynamicSearch && isLoading) {
        try {
          console.log(`[IMAGE-COMPONENT] Searching for image for: ${brand} ${name}`);
          const dynamicUrl = await dynamicImageSearch(name, brand);
          
          if (isMounted) {
            if (dynamicUrl) {
              console.log(`[IMAGE-COMPONENT] Found image for: ${brand} ${name}`);
              setDisplayUrl(getSafeImageUrl(dynamicUrl));
            } else {
              console.log(`[IMAGE-COMPONENT] No image found for: ${brand} ${name}, using placeholder`);
              setDisplayUrl('/images/bottle-placeholder.png');
              setLoadError(true);
            }
          }
        } catch (error) {
          console.error(`[IMAGE-COMPONENT] Error loading image for: ${brand} ${name}`, error);
          if (isMounted) {
            setDisplayUrl('/images/bottle-placeholder.png');
            setLoadError(true);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    };
    
    if (attemptedDynamicSearch && isLoading) {
      fetchDynamicImage();
    }
    
    return () => {
      isMounted = false;
    };
  }, [attemptedDynamicSearch, isLoading, name, brand]);
  
  // Set a timeout to prevent infinite loading
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isLoading) {
      timeoutId = setTimeout(() => {
        console.warn(`[IMAGE-COMPONENT] Loading timeout for ${brand} ${name}`);
        setIsLoading(false);
        setDisplayUrl('/images/bottle-placeholder.png');
      }, 5000); // 5 second timeout
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading, brand, name]);
  
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center">
          <div className="animate-pulse bg-gray-800 rounded-lg w-32 h-48 mb-2"></div>
          <span className="text-sm text-gray-500">Loading image...</span>
        </div>
      ) : (
        <SafeImage
          src={displayUrl || '/images/bottle-placeholder.png'}
          alt={name}
          width={width}
          height={height}
          style={{ height: 'auto' }}
          className={`object-contain max-h-56 max-w-[80%] transition-transform group-hover:scale-105 ${className || ''}`}
          loading="lazy"
          priority={priority}
          fallback={
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-800/50">
              <ImageIcon className="w-12 h-12 mb-2 opacity-30" />
              <span>{name}</span>
              {brand && <span className="text-xs text-gray-600">{brand}</span>}
            </div>
          }
        />
      )}
    </div>
  );
} 