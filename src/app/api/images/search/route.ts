import { NextResponse } from 'next/server';

const FALLBACK_IMAGE_URLS: Record<string, string> = {
  'bourbon': 'https://www.kindpng.com/picc/m/178-1780189_bourbon-whiskey-bottle-png-transparent-png.png',
  'whiskey': 'https://www.kindpng.com/picc/m/418-4188334_jack-daniels-tennessee-honey-whiskey-bottle-png-transparent.png',
  'scotch': 'https://www.kindpng.com/picc/m/112-1129678_whisky-bottle-png-johnnie-walker-blue-label-transparent.png',
  'rye': 'https://cdn.shopify.com/s/files/1/0495/5690/1705/products/8A97E3CE-FE5F-4E0A-91ED-AFE7347A176E_1200x1200.png',
  'tequila': 'https://www.kindpng.com/picc/m/54-546324_tequila-bottle-png-tequila-bottle-transparent-png.png',
  'rum': 'https://www.kindpng.com/picc/m/16-168549_rum-bottle-png-rum-bottle-transparent-background-png.png',
  'gin': 'https://www.kindpng.com/picc/m/112-1124644_hendricks-gin-bottle-png-transparent-png.png',
  'vodka': 'https://www.kindpng.com/picc/m/41-418822_vodka-bottle-png-grey-goose-vodka-transparent-png.png'
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const type = url.searchParams.get('type')?.toLowerCase() || '';
    
    if (!query) {
      return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
    }
    
    console.log(`[IMAGE-SEARCH] Searching for image: "${query}" type: "${type}"`);
    
    // Clean query for search
    const cleanQuery = `${query} ${type || 'whiskey'} bottle`;
    
    // Check for API key
    const bingApiKey = process.env.BING_SEARCH_API_KEY;
    let imageUrl: string | undefined;
    
    if (bingApiKey) {
      try {
        // Try to find an image using Bing Image Search
        imageUrl = await searchBingImages(cleanQuery, bingApiKey);
      } catch (error) {
        console.error('Bing image search error:', error);
      }
    }
    
    // If no image found from APIs, use fallback
    if (!imageUrl) {
      // Try to determine spirit type
      const spiritType = determineType(query, type);
      
      // Use type-specific fallback
      imageUrl = FALLBACK_IMAGE_URLS[spiritType] || FALLBACK_IMAGE_URLS['whiskey'];
      console.log(`[IMAGE-SEARCH] Using fallback image for type: ${spiritType}`);
    }
    
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Search for images using Bing Image Search API
 */
async function searchBingImages(query: string, apiKey: string): Promise<string | undefined> {
  try {
    // Create URL for Bing Image Search API
    const endpoint = 'https://api.bing.microsoft.com/v7.0/images/search';
    const url = `${endpoint}?q=${encodeURIComponent(query)}&count=5&aspect=Tall`;
    
    // Fetch results from Bing
    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`Bing API responded with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract image URLs from response
    if (data.value && data.value.length > 0) {
      // Get all images
      const images = data.value;
      
      // First try to find an image with transparent background
      const transparentImage = images.find((img: any) => 
        img.encodingFormat === 'png' && 
        (img.contentUrl.includes('transparent') || img.name.toLowerCase().includes('transparent'))
      );
      
      if (transparentImage) {
        return transparentImage.contentUrl;
      }
      
      // Find bottle-shaped images (taller than wide)
      const bottleImages = images.filter((img: any) => {
        // Bottles are typically taller than wide
        return img.height > img.width * 1.2;
      });
      
      if (bottleImages.length > 0) {
        // Prioritize PNG images which might have transparent backgrounds
        const pngImage = bottleImages.find((img: any) => img.encodingFormat === 'png');
        if (pngImage) {
          return pngImage.contentUrl;
        }
        
        // Otherwise use the first bottle-shaped image
        return bottleImages[0].contentUrl;
      }
      
      // If no suitable bottle images, use the first result
      return images[0].contentUrl;
    }
    
    return undefined;
  } catch (error) {
    console.error('Error searching Bing images:', error);
    return undefined;
  }
}

/**
 * Determine spirit type from query and type hint
 */
function determineType(query: string, typeHint: string | null): string {
  const queryLower = query.toLowerCase();
  const types = Object.keys(FALLBACK_IMAGE_URLS);
  
  // If type hint is provided and valid, use it
  if (typeHint && types.includes(typeHint.toLowerCase())) {
    return typeHint.toLowerCase();
  }
  
  // Otherwise try to determine from query
  for (const type of types) {
    if (queryLower.includes(type)) {
      return type;
    }
  }
  
  // Default to whiskey
  return 'whiskey';
} 