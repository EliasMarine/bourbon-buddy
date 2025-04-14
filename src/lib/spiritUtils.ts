import { PrismaClient } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Get a safe image URL that works with Content Security Policy
 * This either returns a proxied URL for external images or the original URL for local images
 * 
 * @param url The original image URL
 * @param useProxy Whether to force using the proxy even for local URLs
 * @returns A safe URL that works with CSP
 */
export function getSafeImageUrl(url: string | null | undefined, useProxy = true): string {
  // Return a placeholder if URL is missing
  if (!url) return '/images/bottle-placeholder.png';
  
  // Handle special cases that could cause issues
  if (url === 'null' || url === 'undefined' || url === '') {
    return '/images/bottle-placeholder.png';
  }
  
  // For local images, return as is
  if (url.startsWith('/')) return url;
  
  // For external URLs, use our proxy API
  if (url.startsWith('http') && useProxy) {
    try {
      // Add cache-busting parameter for browser caching
      const cacheBuster = `&_cb=${Date.now()}`;
      return `/api/proxy/image?url=${encodeURIComponent(url)}${cacheBuster}`;
    } catch (error) {
      console.error('Error processing image URL:', error);
      return '/images/bottle-placeholder.png';
    }
  }
  
  // Handle relative URLs that don't start with slash
  if (!url.startsWith('http') && !url.startsWith('/') && !url.startsWith('data:')) {
    return `/${url}`; // Convert to absolute path
  }
  
  // Data URLs can be used directly
  if (url.startsWith('data:')) {
    return url;
  }
  
  // If we reach here, the URL format is unexpected - return a placeholder
  console.warn('Unexpected image URL format:', url);
  return '/images/bottle-placeholder.png';
}

/**
 * Dynamically fetch a bottle image for any spirit
 * 
 * @param spiritName The name of the spirit
 * @param brand The brand of the spirit (optional)
 * @returns Promise resolving to an image URL or undefined
 */
export async function dynamicImageSearch(spiritName: string, brand?: string): Promise<string | undefined> {
  try {
    if (!spiritName) return getGenericBottleImage('whiskey');
    
    // Clean up query to improve search results
    const cleanName = spiritName.replace(/[^\w\s]/gi, '').trim();
    const cleanBrand = brand ? brand.replace(/[^\w\s]/gi, '').trim() : '';
    
    // Detect spirit type from the name
    const spiritType = detectSpiritType(cleanName);
    
    // First try: our web search API with a timeout to prevent getting stuck
    try {
      const searchTerms = [cleanBrand, cleanName, spiritType, 'bottle'].filter(Boolean).join(' ');
      console.log(`[IMAGE] Searching for image: ${searchTerms}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`/api/web-search?query=${encodeURIComponent(searchTerms)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.relatedInfo?.product?.webImageUrl) {
          console.log(`[IMAGE] Found web image for ${searchTerms}`);
          return data.relatedInfo.product.webImageUrl;
        }
      }
    } catch (searchError) {
      if (searchError.name === 'AbortError') {
        console.warn('[IMAGE] Web search timed out');
      } else {
        console.error('[IMAGE] Error searching web API:', searchError);
      }
    }
    
    // Second try: our dedicated image search API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const imageSearchResponse = await fetch(
        `/api/images/search?q=${encodeURIComponent(cleanName)}&type=${encodeURIComponent(spiritType)}`, 
        { 
          method: 'GET',
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (imageSearchResponse.ok) {
        const data = await imageSearchResponse.json();
        if (data.imageUrl) {
          console.log(`[IMAGE] Found image via dedicated search API for ${cleanName}`);
          return data.imageUrl;
        }
      }
    } catch (imageSearchError) {
      if (imageSearchError.name === 'AbortError') {
        console.warn('[IMAGE] Dedicated image search timed out');
      } else {
        console.error('[IMAGE] Error using dedicated image search:', imageSearchError);
      }
    }
    
    // If both API calls fail, use generic image
    console.log(`[IMAGE] Using generic ${spiritType} image for ${cleanName}`);
    return getGenericBottleImage(spiritType);
  } catch (error) {
    console.error('[IMAGE] Image search error:', error);
    return getGenericBottleImage('whiskey'); // Always return something
  }
}

/**
 * Detect the type of spirit from the query text
 * @param query The search query
 * @returns The detected spirit type
 */
function detectSpiritType(query: string): string {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('bourbon')) return 'bourbon';
  if (queryLower.includes('scotch') || queryLower.includes('single malt')) return 'scotch';
  if (queryLower.includes('rye')) return 'rye';
  if (queryLower.includes('whiskey') || queryLower.includes('whisky')) return 'whiskey';
  if (queryLower.includes('tequila')) return 'tequila';
  if (queryLower.includes('rum')) return 'rum';
  if (queryLower.includes('gin')) return 'gin';
  if (queryLower.includes('vodka')) return 'vodka';
  
  // Default to whiskey if no specific type is detected
  return 'whiskey';
}

/**
 * Get a generic bottle image for a specific spirit type
 * @param spiritType The type of spirit
 * @returns URL to a generic bottle image
 */
function getGenericBottleImage(spiritType: string): string {
  // Generic bottle images for different spirit types
  const genericImages: Record<string, string> = {
    bourbon: 'https://www.kindpng.com/picc/m/178-1780189_bourbon-whiskey-bottle-png-transparent-png.png',
    scotch: 'https://www.kindpng.com/picc/m/112-1129678_whisky-bottle-png-johnnie-walker-blue-label-transparent.png',
    rye: 'https://cdn.shopify.com/s/files/1/0495/5690/1705/products/8A97E3CE-FE5F-4E0A-91ED-AFE7347A176E_1200x1200.png',
    whiskey: 'https://www.kindpng.com/picc/m/418-4188334_jack-daniels-tennessee-honey-whiskey-bottle-png-transparent.png',
    tequila: 'https://www.kindpng.com/picc/m/54-546324_tequila-bottle-png-tequila-bottle-transparent-png.png',
    rum: 'https://www.kindpng.com/picc/m/16-168549_rum-bottle-png-rum-bottle-transparent-background-png.png',
    gin: 'https://www.kindpng.com/picc/m/112-1124644_hendricks-gin-bottle-png-transparent-png.png',
    vodka: 'https://www.kindpng.com/picc/m/41-418822_vodka-bottle-png-grey-goose-vodka-transparent-png.png'
  };
  
  return genericImages[spiritType] || genericImages.whiskey;
}

/**
 * Utility to attempt recovery of a deleted spirit if it exists in console logs
 * This is a simple implementation - in a production environment, you would:
 * 1. Store backups in a database table or file storage
 * 2. Create proper admin interfaces for recovery operations
 * 3. Add authentication and logging for recovery attempts
 */
export async function recoverDeletedSpirit(backupId: string, userId: string) {
  try {
    // In a real implementation, you would:
    // 1. Look up the backup in your backup storage system
    // 2. Validate the requesting user has permission to recover it
    // 3. Create a new record with the backed up data
    
    // For demonstration purposes only:
    console.log(`Attempting to recover spirit with backup ID: ${backupId} for user ${userId}`);
    console.log(`Check server logs for the backup data with _backupId: ${backupId}`);
    
    // This would normally retrieve from storage:
    // const backupData = await prisma.spiritBackup.findUnique({ where: { backupId } });
    
    // Example restoration logic (needs real backup implementation):
    // if (backupData) {
    //   const { id, createdAt, updatedAt, deletedAt, _backupId, reviews, ...restorationData } = backupData;
    //   
    //   // Create a new spirit with the backed up data
    //   const restoredSpirit = await prisma.spirit.create({
    //     data: {
    //       ...restorationData,
    //       ownerId: userId
    //     }
    //   });
    //   
    //   return restoredSpirit;
    // }
    
    return { message: 'Recovery would be performed here in a production system' };
  } catch (error) {
    console.error('Spirit recovery failed:', error);
    throw new Error('Failed to recover spirit from backup');
  }
}

/**
 * In a production environment, you could also add these utility functions:
 * 
 * 1. listUserDeletedSpirits(userId): List all backups for a user
 * 2. exportBackupToFile(backupId): Export a backup to a downloadable file
 * 3. importBackupFromFile(file): Import a backup from a file
 */ 