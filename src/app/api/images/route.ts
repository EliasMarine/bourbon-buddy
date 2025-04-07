import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// Create a Supabase client with service role key for server operations
// The service role key can bypass RLS policies
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Default cache duration - 7 days (much longer for better caching)
const DEFAULT_CACHE_DURATION = 60 * 60 * 24 * 7

// Generate a stable ETag for a bucket and path
function generateETag(bucket: string, path: string): string {
  return createHash('md5').update(`${bucket}:${path}`).digest('hex')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket')
    const path = searchParams.get('path')
    const noCache = searchParams.has('t') // If timestamp is present, it's a no-cache request
    
    // Validate parameters
    if (!bucket || !path) {
      return new NextResponse('Missing bucket or path parameters', { status: 400 })
    }
    
    // Generate a stable ETag for this resource
    const etag = `"${generateETag(bucket, path)}"`
    
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
        const cache = caches.open('image-cache')
        const cachedResponse = await (await cache).match(request)
        if (cachedResponse) {
          return cachedResponse
        }
      } catch (err) {
        // Silently continue if caching is not supported
        console.error('Cache read error:', err)
      }
    }

    // Download directly from Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path)

    if (error) {
      return new NextResponse(
        `Storage error: ${error.message}`, 
        { status: error.message.includes('not found') ? 404 : 500 }
      )
    }

    if (!data) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Get the file content as array buffer
    const buffer = await data.arrayBuffer()

    // Determine cache control based on whether it's a no-cache request
    const cacheControl = noCache
      ? 'no-cache, no-store, must-revalidate'
      : `public, max-age=${DEFAULT_CACHE_DURATION}, immutable`

    // Return the image with appropriate headers
    const response = new NextResponse(buffer, {
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Cache-Control': cacheControl,
        'ETag': etag,
      },
    })

    // Store the response in the cache if it's not a no-cache request and caching is supported
    if (!noCache && typeof caches !== 'undefined') {
      try {
        const cache = await caches.open('image-cache')
        await cache.put(request, response.clone())
      } catch (err) {
        console.error('Cache storage error:', err)
      }
    }

    return response
  } catch (error) {
    console.error('Image API error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 