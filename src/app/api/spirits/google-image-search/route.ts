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

    // Build a more specific search query for better results
    let searchParts = [];
    
    // Always prioritize the exact brand and name combination for more accurate results
    if (brand && name) {
      // Put brand first, then name for better image search results
      searchParts.push(`${brand} ${name}`);
    } else if (brand) {
      searchParts.push(brand);
    } else if (name) {
      searchParts.push(name);
    }
    
    // Add type if available, but make it more specific
    if (type) {
      // Be specific about whiskey types for better results
      if (type === 'Bourbon') {
        searchParts.push('bourbon whiskey');
      } else if (type === 'Rye') {
        searchParts.push('rye whiskey');
      } else if (type === 'Scotch') {
        searchParts.push('scotch whisky');
      } else if (type === 'Irish') {
        searchParts.push('irish whiskey');
      } else if (type === 'Japanese') {
        searchParts.push('japanese whisky');
      } else if (type !== 'Other') {
        searchParts.push(type);
      }
    }
    
    if (year) searchParts.push(year);
    
    // Add these specific terms to get better bottle results
    searchParts.push('bottle official');
    
    // Join all parts with spaces
    const query = searchParts.join(' ');
    console.log(`[DEBUG] Performing image search for: "${query}"`);

    // Try to use reliable sources first
    let images: ImageResult[] = [];
    
    // 1. First try The Whisky Exchange, a reliable source for high-quality spirit images
    const whiskyExchangeImages = await fetchWhiskyExchangeImages(query);
    if (whiskyExchangeImages.length > 0) {
      images = [...images, ...whiskyExchangeImages];
      console.log(`[DEBUG] Found ${whiskyExchangeImages.length} images from The Whisky Exchange`);
    }
    
    // 2. Then try Bing search with improved query
    if (images.length < 5) {
      // Add "official" to the query to get more official product images
      const enhancedQuery = query + ' official product';
      const bingImages = await fetchBingImages(enhancedQuery);
      
      // Combine results, avoiding duplicates
      const existingUrls = new Set(images.map(img => img.url));
      for (const img of bingImages) {
        if (!existingUrls.has(img.url)) {
          images.push(img);
          existingUrls.add(img.url);
        }
      }
    }
    
    // 3. Fall back to Google as a last resort
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
    
    // If still no images found, use fallbacks based on spirit type
    if (images.length === 0) {
      images = getFallbackImages(query, type || '');
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

// New function to fetch images from The Whisky Exchange
async function fetchWhiskyExchangeImages(query: string): Promise<ImageResult[]> {
  try {
    // Create a better formatted search query
    const searchTerms = query.split(' ').filter(term => 
      !['bottle', 'official', 'product'].includes(term.toLowerCase())
    );
    const searchTerm = searchTerms.join('+');
    const searchUrl = `https://www.thewhiskyexchange.com/search?q=${encodeURIComponent(searchTerm)}`;
    
    console.log(`[DEBUG] Searching The Whisky Exchange with URL: ${searchUrl}`);
    
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (!response.ok) {
      console.error(`[ERROR] Whisky Exchange search failed: ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    const $ = load(html);
    const images: ImageResult[] = [];
    
    // Look for product listings
    $('.product-grid .product-card').each((_, element) => {
      try {
        const imgElement = $(element).find('.product-card__image img');
        const imgUrl = imgElement.attr('src') || imgElement.attr('data-src');
        const title = $(element).find('.product-card__name').text().trim();
        
        if (imgUrl && title) {
          // Convert relative URLs to absolute
          const finalUrl = imgUrl.startsWith('http') 
            ? imgUrl 
            : `https://www.thewhiskyexchange.com${imgUrl}`;
          
          images.push({
            url: finalUrl,
            alt: title,
            source: 'The Whisky Exchange'
          });
        }
      } catch (e) {
        console.error('[ERROR] Error extracting Whisky Exchange image:', e);
      }
    });
    
    return images;
  } catch (error) {
    console.error('[ERROR] Error fetching from Whisky Exchange:', error);
    return [];
  }
}

// Improved Bing image search function
async function fetchBingImages(query: string): Promise<ImageResult[]> {
  try {
    // Encode the search query
    const enhancedQuery = `${query} high resolution`;
    const encodedQuery = encodeURIComponent(enhancedQuery);
    
    // Define a custom User-Agent to avoid being blocked
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';
    
    // Use Bing image search with additional filters for photos
    const searchUrl = `https://www.bing.com/images/search?q=${encodedQuery}&qft=+filterui:photo-photo+filterui:aspect-square&form=IRFLTR`;
    
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
          
          urlMatches.forEach((match: string) => {
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
          
          // Skip Reddit and BusinessWire URLs as they don't work with our proxy
          if (lowerUrl.includes('reddit.com') || 
              lowerUrl.includes('redd.it') || 
              lowerUrl.includes('businesswire.com')) {
            return false;
          }
          
          // Prioritize URLs from reliable sources
          if (lowerUrl.includes('thewhiskyexchange.com') || 
              lowerUrl.includes('totalwine.com') || 
              lowerUrl.includes('whiskyshop.com') ||
              lowerUrl.includes('reservebar.com') ||
              lowerUrl.includes('drizly.com')) {
            return true;
          }
          
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
    // Enhance the query for better results
    const enhancedQuery = `${query} bottle high quality product`;
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
    const searchUrl = `https://www.google.com/search?q=${encodedQuery}&tbm=isch&source=lnms&tbs=isz:m,iar:s`;
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
            !cleanUrl.includes('reddit.com') &&
            !cleanUrl.includes('redd.it') &&
            !cleanUrl.includes('businesswire.com') &&
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
          !cleanUrl.includes('reddit.com') &&
          !cleanUrl.includes('redd.it') &&
          !cleanUrl.includes('businesswire.com') &&
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

// Improved fallback images when search fails
function getFallbackImages(query: string, type: string): ImageResult[] {
  console.log(`[DEBUG] Using fallback images for query: "${query}", type: "${type}"`);
  
  // Determine type for more accurate fallbacks
  const lowerQuery = query.toLowerCase();
  const lowerType = type.toLowerCase();
  
  if (lowerType.includes('bourbon') || lowerQuery.includes('bourbon')) {
    return [
      {
        url: 'https://img.thewhiskyexchange.com/900/brbon_buf10.jpg',
        alt: 'Buffalo Trace Bourbon',
        source: 'Fallback Image - Bourbon'
      },
      {
        url: 'https://img.thewhiskyexchange.com/900/brbon_mak4.jpg',
        alt: "Maker's Mark Bourbon",
        source: 'Fallback Image - Bourbon'
      },
      {
        url: 'https://img.thewhiskyexchange.com/900/brbon_woo8.jpg',
        alt: 'Woodford Reserve Bourbon',
        source: 'Fallback Image - Bourbon'
      }
    ];
  } else if (lowerType.includes('rye') || lowerQuery.includes('rye')) {
    return [
      {
        url: 'https://img.thewhiskyexchange.com/900/rye_bul1.jpg',
        alt: 'Bulleit Rye Whiskey',
        source: 'Fallback Image - Rye'
      },
      {
        url: 'https://img.thewhiskyexchange.com/900/rye_saz1.jpg',
        alt: 'Sazerac Rye Whiskey',
        source: 'Fallback Image - Rye'
      },
      {
        url: 'https://img.thewhiskyexchange.com/900/rye_whi4.jpg',
        alt: 'WhistlePig Rye Whiskey',
        source: 'Fallback Image - Rye'
      }
    ];
  } else if (lowerType.includes('scotch') || lowerQuery.includes('scotch') || lowerQuery.includes('whisky')) {
    return [
      {
        url: 'https://img.thewhiskyexchange.com/900/macob_12yo_14.jpg',
        alt: 'Macallan 12 Year Scotch Whisky',
        source: 'Fallback Image - Scotch'
      },
      {
        url: 'https://img.thewhiskyexchange.com/900/laga_16y1.jpg',
        alt: 'Lagavulin 16 Year Scotch Whisky',
        source: 'Fallback Image - Scotch'
      },
      {
        url: 'https://img.thewhiskyexchange.com/900/glenf_12y1.jpg',
        alt: 'Glenfiddich 12 Year Scotch Whisky',
        source: 'Fallback Image - Scotch'
      }
    ];
  } else if (lowerType.includes('irish') || lowerQuery.includes('irish')) {
    return [
      {
        url: 'https://img.thewhiskyexchange.com/900/irish_jam1.jpg',
        alt: 'Jameson Irish Whiskey',
        source: 'Fallback Image - Irish Whiskey'
      },
      {
        url: 'https://img.thewhiskyexchange.com/900/irish_red3.jpg',
        alt: 'Redbreast 12 Year Irish Whiskey',
        source: 'Fallback Image - Irish Whiskey'
      }
    ];
  } else if (lowerType.includes('japanese') || lowerQuery.includes('japanese')) {
    return [
      {
        url: 'https://img.thewhiskyexchange.com/900/japan_yam2.jpg',
        alt: 'Yamazaki 12 Year Japanese Whisky',
        source: 'Fallback Image - Japanese Whisky'
      },
      {
        url: 'https://img.thewhiskyexchange.com/900/japan_nik20.jpg',
        alt: 'Nikka Coffey Grain Japanese Whisky',
        source: 'Fallback Image - Japanese Whisky'
      }
    ];
  } else {
    // Generic spirit image fallbacks
    return [
      {
        url: 'https://img.thewhiskyexchange.com/900/brbon_mak4.jpg',
        alt: 'Maker\'s Mark Bourbon',
        source: 'Fallback Image'
      },
      {
        url: 'https://img.thewhiskyexchange.com/900/brbon_buf15.jpg',
        alt: 'Buffalo Trace Bourbon',
        source: 'Fallback Image'
      }
    ];
  }
} 