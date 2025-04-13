import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// Default cache duration - 7 days
const DEFAULT_CACHE_DURATION = 60 * 60 * 24 * 7

// Generate a stable ETag for a URL
function generateETag(url: string): string {
  return createHash('md5').update(url).digest('hex')
}

/**
 * Image proxy API endpoint
 * Usage: /api/proxy/image?url=https://example.com/image.jpg
 * 
 * This endpoint fetches an external image and serves it from our domain,
 * bypassing Content Security Policy restrictions.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    const noCache = searchParams.has('t') // If timestamp is present, it's a no-cache request
    
    // Validate parameters
    if (!imageUrl) {
      return new NextResponse('Missing url parameter', { status: 400 })
    }
    
    // Generate a stable ETag for this resource
    const etag = `"${generateETag(imageUrl)}"`
    
    // Check for If-None-Match header for ETag-based caching
    const ifNoneMatch = request.headers.get('If-None-Match')
    if (!noCache && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304, // Not Modified
        headers: {
          'Cache-Control': `public, max-age=${DEFAULT_CACHE_DURATION}, immutable`,
          'ETag': etag,
        }
      })
    }
    
    // Attempt to use cache in environments that support it
    if (!noCache && typeof caches !== 'undefined') {
      try {
        const cache = await caches.open('image-proxy-cache')
        const cachedResponse = await cache.match(request)
        if (cachedResponse) {
          return cachedResponse
        }
      } catch (err) {
        // Silently continue if caching is not supported
        console.error('Cache read error:', err)
      }
    }

    // Fetch the external image
    const imageResponse = await fetch(imageUrl, {
      headers: {
        // Set a user agent to avoid being blocked by some servers
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/jpeg,image/png,image/webp,image/gif,image/*',
        'Referer': new URL(imageUrl).origin,
        // Add origin header to help with CORS
        'Origin': process.env.NEXT_PUBLIC_URL || new URL(request.url).origin
      },
      cache: 'no-store',
      // Ensure cookies aren't sent with the fetch
      credentials: 'omit',
      // Increase timeout for slow image servers
      signal: AbortSignal.timeout(15000) // 15 second timeout
    }).catch(error => {
      console.error('Fetch error:', error);
      return null;
    });

    if (!imageResponse || !imageResponse.ok) {
      const status = imageResponse?.status || 502;
      const statusText = imageResponse?.statusText || 'Bad Gateway';
      console.error(`Image fetch failed: ${status} ${statusText} for URL: ${imageUrl}`);
      
      // Special handling for common problems
      if (imageUrl.includes('reddit.com') || imageUrl.includes('redd.it')) {
        return new NextResponse('Reddit images require authentication and cannot be proxied', { status: 403 });
      }
      
      if (imageUrl.includes('businesswire.com')) {
        return new NextResponse('BusinessWire images have special protection and cannot be proxied', { status: 403 });
      }
      
      // Try to salvage the situation by returning the placeholder instead of an error
      try {
        const placeholderPath = './public/images/bottle-placeholder.png';
        const fsPromises = require('fs').promises;
        const placeholderData = await fsPromises.readFile(placeholderPath);
        
        return new NextResponse(placeholderData, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
            'X-Content-Type-Options': 'nosniff',
          }
        });
      } catch (placeholderError) {
        console.error('Failed to serve placeholder image:', placeholderError);
        return new NextResponse(
          `Failed to fetch image: ${status} ${statusText}`, 
          { status }
        );
      }
    }

    // Get the image data
    const imageData = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg'

    // Determine cache control based on whether it's a no-cache request
    const cacheControl = noCache
      ? 'no-cache, no-store, must-revalidate'
      : `public, max-age=${DEFAULT_CACHE_DURATION}, immutable`

    // Return the image with appropriate headers
    const response = new NextResponse(imageData, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'ETag': etag,
        // Add security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        // Add CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD',
        'Access-Control-Max-Age': '86400',
      },
    })

    // Store the response in the cache if it's not a no-cache request and caching is supported
    if (!noCache && typeof caches !== 'undefined') {
      try {
        const cache = await caches.open('image-proxy-cache')
        await cache.put(request, response.clone())
      } catch (err) {
        console.error('Cache storage error:', err)
      }
    }

    return response
  } catch (error) {
    console.error('Image proxy error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
} 