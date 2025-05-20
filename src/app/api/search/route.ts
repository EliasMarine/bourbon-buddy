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
    
    const response = await fetch(serpApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      console.error(`SerpAPI responded with status: ${response.status}`);
      throw new Error(`SerpAPI responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return the response data to the client
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error with SerpAPI proxy:", error);
    return NextResponse.json(
      { error: "Failed to fetch search results", details: (error as Error).message },
      { status: 500 }
    );
  }
} 