import { NextRequest, NextResponse } from "next/server";

/**
 * Image proxy endpoint that fetches images from external sources and serves them
 * from our own domain, eliminating the need for extensive CSP img-src directives.
 * 
 * This helps with CSP compliance by ensuring all images come from our own domain.
 */
export async function GET(request: NextRequest) {
  try {
    // Get the URL from the query parameters
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return new NextResponse('Image URL is required', { status: 400 });
    }
    
    // Verify the URL is valid
    try {
      new URL(url);
    } catch (e) {
      return new NextResponse('Invalid URL', { status: 400 });
    }
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      // Fetch the image from the original source
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          // Set a proper User-Agent to avoid being blocked
          'User-Agent': 'Mozilla/5.0 (compatible; BourbonBuddy/1.0)'
        }
      });
      
      // Clear timeout as request completed
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      // Get the content type
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      // Only allow image content types
      if (!contentType.startsWith('image/')) {
        return new NextResponse('Not an image', { status: 400 });
      }
      
      // Get the image data
      const imageData = await response.arrayBuffer();
      
      // Create a response with the image data and appropriate headers
      return new NextResponse(imageData, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400', // Cache for 1 day
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new NextResponse('Image fetch timed out', { status: 408 });
      }
      
      return new NextResponse(`Failed to fetch image: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`, { 
        status: 500 
      });
    }
  } catch (error) {
    console.error('Error in image proxy:', error);
    return new NextResponse(`Image proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500 
    });
  }
} 