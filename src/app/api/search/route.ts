import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for SerpAPI requests to avoid CORS issues
 * This route handles the search request and forwards it to SerpAPI
 * while keeping the API key secure on the server
 */
export async function POST(request: NextRequest) {
  try {
    // Get search parameters from request body
    const body = await request.json();
    const { query, searchType = 'web' } = body;
    
    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }
    
    // Construct SerpAPI URL with API key from environment variables
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      console.error("SERPAPI_KEY not found in environment variables");
      return NextResponse.json(
        { error: "Search service configuration error" },
        { status: 500 }
      );
    }
    
    // Build search parameters based on search type
    const searchParams = new URLSearchParams({
      q: query,
      api_key: apiKey,
    });
    
    // Configure search parameters differently for web vs image search
    if (searchType === 'images') {
      searchParams.append('engine', 'google_images');
      searchParams.append('tbm', 'isch');
      searchParams.append('num', '10');
    } else {
      // Default web search
      searchParams.append('engine', 'google');
      searchParams.append('gl', 'us');
      searchParams.append('hl', 'en');
      searchParams.append('num', '5');
      searchParams.append('safe', 'active');
    }
    
    // Make request to SerpAPI from the server
    const serpApiUrl = `https://serpapi.com/search.json?${searchParams.toString()}`;
    console.log(`[Server] Calling SerpAPI: ${serpApiUrl.replace(apiKey, '*****')}`);
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      const response = await fetch(serpApiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        signal: controller.signal
      });
      
      // Clear timeout as request completed
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`SerpAPI responded with status: ${response.status}`);
        throw new Error(`SerpAPI responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // If this is an image search, modify the image URLs to go through our proxy
      if (searchType === 'images' && data.images_results) {
        data.images_results = data.images_results.map((img: any) => {
          if (img.original) {
            // Encode the original URL as a query parameter for our proxy
            const encodedUrl = encodeURIComponent(img.original);
            img.proxy_url = `/api/image-proxy?url=${encodedUrl}`;
            // For backward compatibility, keep the original URL but also add the proxy URL
            img.original_url = img.original;
            img.original = img.proxy_url;
          }
          return img;
        });
      }
      
      // Return the response data to the client
      return NextResponse.json(data);
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('SerpAPI request timed out after 8 seconds');
        return NextResponse.json(
          { 
            error: "Search request timed out", 
            fallback: true,
            organic_results: [
              { title: "No results found", snippet: "The search timed out. Please try again with a simpler query." }
            ]
          },
          { status: 408 }
        );
      }
      throw fetchError; // Rethrow other fetch errors to be caught by outer try/catch
    }
  } catch (error) {
    console.error("Error with SerpAPI proxy:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch search results", 
        details: (error as Error).message,
        fallback: true,
        organic_results: [
          { title: "Search error", snippet: "There was an error processing your search. Please try again." }
        ]
      },
      { status: 500 }
    );
  }
} 