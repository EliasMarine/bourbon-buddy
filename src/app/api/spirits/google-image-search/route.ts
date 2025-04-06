import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';

interface GoogleImageSearchResult {
  images: ImageResult[];
  query: string;
}

interface ImageResult {
  url: string;
  alt: string;
  source: string;
}

// GET /api/spirits/google-image-search - Search for spirit images using Google
export async function GET(request: Request) {
  try {
    // Get the search query from URL params
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    const brand = url.searchParams.get('brand');
    const type = url.searchParams.get('type');
    const year = url.searchParams.get('year');

    if (!name && !brand) {
      return NextResponse.json(
        { error: 'Missing search parameters. Include at least name or brand.' },
        { status: 400 }
      );
    }

    // Build the search query
    let searchParts = [];
    
    if (brand) searchParts.push(brand);
    if (name) searchParts.push(name);
    if (type && type !== 'Other') searchParts.push(type);
    if (year) searchParts.push(year);
    
    // Always add specific terms to get better bottle results
    searchParts.push('bottle');
    
    // Join all parts with spaces
    const query = searchParts.join(' ');
    console.log(`[DEBUG] Performing Google image search for: "${query}"`);

    // First try Bing search as they often have better high-quality images
    let images = await fetchBingImages(query);
    
    // Fall back to Google if Bing didn't yield enough results
    if (images.length < 5) {
      const googleImages = await fetchGoogleImages(query);
      // Combine results, avoiding duplicates
      const existingUrls = new Set(images.map(img => img.url));
      for (const img of googleImages) {
        if (!existingUrls.has(img.url)) {
          images.push(img);
          existingUrls.add(img.url);
        }
      }
    }
    
    console.log(`[DEBUG] Total images found: ${images.length}`);
    
    const results: GoogleImageSearchResult = {
      images,
      query
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error('[ERROR] Image search error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

// Function to fetch images from Bing
async function fetchBingImages(query: string): Promise<ImageResult[]> {
  try {
    // Encode the search query
    const enhancedQuery = `${query} high resolution`;
    const encodedQuery = encodeURIComponent(enhancedQuery);
    
    // Define a custom User-Agent to avoid being blocked
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';
    
    // Use Bing image search
    const searchUrl = `https://www.bing.com/images/search?q=${encodedQuery}&qft=+filterui:photo-photo&form=IRFLTR`;
    
    console.log(`[DEBUG] Searching Bing with URL: ${searchUrl}`);
    
    // Fetch the search page
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Referer': 'https://www.bing.com/',
      }
    });
    
    if (!response.ok) {
      console.error(`[ERROR] Bing search failed with status: ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    console.log(`[DEBUG] Received Bing HTML content length: ${html.length} bytes`);
    
    // Parse the HTML response
    const $ = load(html);
    const images: ImageResult[] = [];
    
    // Extract image data from Bing's JSON structures
    const scriptTags = $('script');
    scriptTags.each((_, script) => {
      const content = $(script).html() || '';
      
      // Look for Bing's image data in script tags
      if (content.includes('iid":') && content.includes('murl":')) {
        try {
          // Extract all image URLs with a more flexible regex
          const urlMatches = content.match(/"murl":"([^"]+)"/g) || [];
          
          urlMatches.forEach(match => {
            const url = match.replace(/"murl":"/, '').replace(/"$/, '');
            
            // Decode escaped URLs
            let decodedUrl = url.replace(/\\u002f/g, '/').replace(/\\\//g, '/');
            
            if (decodedUrl && !images.some(img => img.url === decodedUrl)) {
              images.push({
                url: decodedUrl,
                alt: query,
                source: 'Bing Images'
              });
            }
          });
        } catch (e) {
          console.error('[ERROR] Error extracting Bing image data:', e);
        }
      }
    });
    
    console.log(`[DEBUG] Found ${images.length} images from Bing`);
    
    // Filter for spirit bottle image patterns and limit results
    const filteredImages = images
      .filter(img => {
        try {
          new URL(img.url);
          const lowerUrl = img.url.toLowerCase();
          // Prioritize URLs that look like they contain spirit bottle images
          return lowerUrl.endsWith('.jpg') || 
                 lowerUrl.endsWith('.jpeg') || 
                 lowerUrl.endsWith('.png') ||
                 lowerUrl.includes('bottle') ||
                 lowerUrl.includes('spirit') ||
                 lowerUrl.includes('whiskey') ||
                 lowerUrl.includes('bourbon');
        } catch {
          return false;
        }
      })
      .slice(0, 20);
    
    return filteredImages;
  } catch (error) {
    console.error('[ERROR] Error fetching Bing images:', error);
    return [];
  }
}

// Function to fetch images from Google
async function fetchGoogleImages(query: string): Promise<ImageResult[]> {
  try {
    // Encode the search query
    const enhancedQuery = `${query} bottle high quality`;
    const encodedQuery = encodeURIComponent(enhancedQuery);
    
    // Define headers to simulate a real browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    };
    
    // Direct access to Google image search
    const searchUrl = `https://www.google.com/search?q=${encodedQuery}&tbm=isch&source=lnms`;
    console.log(`[DEBUG] Searching Google with URL: ${searchUrl}`);
    
    const response = await fetch(searchUrl, { headers });
    
    if (!response.ok) {
      console.error(`[ERROR] Google search failed with status: ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    
    // Extract image URLs using a reliable approach
    const imgUrls = extractImageUrlsFromGoogleHtml(html);
    console.log(`[DEBUG] Extracted ${imgUrls.length} image URLs from Google HTML`);
    
    const images = imgUrls.map(url => ({
      url,
      alt: query,
      source: 'Google Images'
    }));
    
    return images.slice(0, 20);
  } catch (error) {
    console.error('[ERROR] Error fetching Google images:', error);
    return [];
  }
}

// Extract image URLs from Google HTML using a more robust approach
function extractImageUrlsFromGoogleHtml(html: string): string[] {
  const imageUrls: string[] = [];
  const urlSet = new Set<string>();
  
  // Method 1: Extract from JSON data in AF_initDataCallback
  try {
    const dataMatches = html.match(/AF_initDataCallback\(({.*?})\);/g) || [];
    
    for (const match of dataMatches) {
      // Look for image URLs within the JSON structure
      const urlMatches = match.match(/"(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp|avif)[^"]*)"/g) || [];
      
      for (const urlMatch of urlMatches) {
        const cleanUrl = urlMatch.replace(/^"|"$/g, '');
        
        if (cleanUrl && 
            !cleanUrl.includes('gstatic.com') && 
            !cleanUrl.includes('google.com') && 
            !urlSet.has(cleanUrl)) {
          imageUrls.push(cleanUrl);
          urlSet.add(cleanUrl);
        }
      }
    }
  } catch (e) {
    console.error('[ERROR] Error extracting from JSON data:', e);
  }
  
  // Method 2: Direct regex for image URLs
  try {
    const directImageMatches = html.match(/\bhttps?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|avif)[^"'\s)]+/g) || [];
    
    for (const url of directImageMatches) {
      // Clean the URL - remove trailing characters that aren't part of URL
      const cleanUrl = url.replace(/[,}\]"']+$/, '');
      
      if (cleanUrl && 
          !cleanUrl.includes('gstatic.com') && 
          !cleanUrl.includes('google.com') &&
          !urlSet.has(cleanUrl)) {
        imageUrls.push(cleanUrl);
        urlSet.add(cleanUrl);
      }
    }
  } catch (e) {
    console.error('[ERROR] Error extracting direct URLs:', e);
  }
  
  return imageUrls;
}

// Fallback images when search fails
function getFallbackImages(query: string): ImageResult[] {
  const lowerQuery = query.toLowerCase();
  console.log(`[DEBUG] Using fallback images for query: ${query}`);
  
  // Define fallback images for common spirit types
  if (lowerQuery.includes('bourbon')) {
    return [
      {
        url: 'https://img.thewhiskyexchange.com/900/brbon_buf10.jpg',
        alt: query,
        source: 'Fallback Image'
      },
      {
        url: 'https://www.totalwine.com/dynamic/490x/media/sys_master/twmmedia/h3c/h70/11635160236062.png',
        alt: query,
        source: 'Fallback Image'
      },
      {
        url: 'https://www.buffalotracedistillery.com/content/dam/buffalotrace/products/brands/buffalo-trace/Buffalo-Trace-Bourbon.png',
        alt: query,
        source: 'Fallback Image'
      }
    ];
  } else if (lowerQuery.includes('scotch') || lowerQuery.includes('whisky')) {
    return [
      {
        url: 'https://img.thewhiskyexchange.com/900/macob_12yo_14.jpg',
        alt: query,
        source: 'Fallback Image'
      },
      {
        url: 'https://www.themacallan.com/sites/default/files/2019-03/12yr-sherry-oak-bottle.png',
        alt: query,
        source: 'Fallback Image'
      },
      {
        url: 'https://www.malts.com/uploads/images/BreakingNewGround/Images/DistilleryProductCarousels/Lagavulin/Lagavulin-16YO.png',
        alt: query,
        source: 'Fallback Image'
      }
    ];
  } else if (lowerQuery.includes('rye')) {
    return [
      {
        url: 'https://img.thewhiskyexchange.com/900/rye_bul1.jpg',
        alt: query,
        source: 'Fallback Image'
      },
      {
        url: 'https://www.bulleit.com/-/media/project/diageo/shared/en/bulleit/products/bulleit-rye/desktop/bulleit-rye-bottle-1-5.png',
        alt: query,
        source: 'Fallback Image'
      },
      {
        url: 'https://www.whistlepigwhiskey.com/assets/img/bottles/10-straight-rye-whiskey.png',
        alt: query,
        source: 'Fallback Image'
      }
    ];
  } else {
    // Generic spirit image
    return [
      {
        url: 'https://img.thewhiskyexchange.com/900/brbon_mak4.jpg',
        alt: query,
        source: 'Fallback Image'
      },
      {
        url: 'https://www.knobcreek.com/-/media/images/knob-creek/platform-images/products/knc_bourbon_2022.png',
        alt: query,
        source: 'Fallback Image'
      }
    ];
  }
} 