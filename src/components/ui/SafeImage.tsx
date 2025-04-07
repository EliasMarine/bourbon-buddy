'use client';

import { useState, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  fallback?: React.ReactNode;
  fallbackClassName?: string;
  useDirectUrl?: boolean;
  useTimestamp?: boolean;
}

/**
 * Parse a Supabase URL to extract bucket and path
 */
function parseSupabaseUrl(url: string): { bucket: string, path: string } | null {
  try {
    // Check if it's a Supabase URL
    if (!url.includes('supabase.co') || !url.includes('/storage/v1/object/public/')) {
      return null;
    }

    // Extract the part after /storage/v1/object/public/
    const parts = url.split('/storage/v1/object/public/');
    if (parts.length !== 2) return null;

    // Split the remaining path into bucket and path
    const pathParts = parts[1].split('/');
    if (pathParts.length < 2) return null;

    const bucket = pathParts[0];
    // Join the rest of the path parts and remove any query parameters
    const path = pathParts.slice(1).join('/').split('?')[0];

    return { bucket, path };
  } catch (e) {
    console.error('Failed to parse Supabase URL:', e);
    return null;
  }
}

export default function SafeImage({
  src,
  alt,
  fallback,
  fallbackClassName,
  className,
  useDirectUrl = false,
  useTimestamp = false,
  ...props
}: SafeImageProps) {
  const [error, setError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [useFallbackUrl, setUseFallbackUrl] = useState(false);
  
  useEffect(() => {
    setError(false);
    setUseFallbackUrl(false);
    
    if (!src) {
      setImageUrl(null);
      return;
    }
    
    // Handle string URLs
    if (typeof src === 'string') {
      // If URL is already using our images API, use as is
      if (src.startsWith('/api/images')) {
        setImageUrl(src);
        return;
      }
      
      // Check if it's a Supabase storage URL
      const parsedUrl = parseSupabaseUrl(src);
      if (parsedUrl && !useDirectUrl && !useFallbackUrl) {
        // Convert to our API format, only add timestamp if explicitly requested
        const url = `/api/images?bucket=${parsedUrl.bucket}&path=${parsedUrl.path}`;
        setImageUrl(useTimestamp ? `${url}&t=${Date.now()}` : url);
        return;
      }
      
      // For direct URLs or fallbacks, only add a cache buster if explicitly requested
      if (src.includes('supabase.co')) {
        // Remove any existing query params
        const baseUrl = src.split('?')[0];
        setImageUrl(useTimestamp ? `${baseUrl}?t=${Date.now()}` : baseUrl);
        return;
      }
      
      // For all other URLs, use as is
      setImageUrl(src);
      return;
    }
    
    // For non-string values (e.g., StaticImageData), use as is
    setImageUrl(src as any);
  }, [src, useDirectUrl, useFallbackUrl, useTimestamp]);

  // Handle API errors by falling back to direct URL
  const handleApiError = () => {
    if (typeof src === 'string' && src.includes('supabase.co')) {
      // Silently fall back to direct URL
      setUseFallbackUrl(true);
      return;
    }
    
    // If can't fall back, show error state
    setError(true);
  };

  // Show fallback for errors or missing URLs
  if (!imageUrl || error) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div 
        className={`bg-gray-800 flex items-center justify-center text-white text-xl font-bold ${fallbackClassName || className || ''}`}
        style={props.fill ? { position: 'absolute', inset: 0 } : { width: props.width, height: props.height }}
      >
        {alt?.charAt(0)?.toUpperCase() || '?'}
      </div>
    );
  }

  // Render image with error handling
  return (
    <Image
      {...props}
      src={imageUrl}
      alt={alt || ''}
      className={className}
      onError={() => {
        if (imageUrl.startsWith('/api/images') && !useFallbackUrl) {
          handleApiError();
        } else {
          setError(true);
        }
      }}
      unoptimized={true} // Always use unoptimized for Supabase URLs
    />
  );
} 