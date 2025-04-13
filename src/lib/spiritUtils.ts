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
  
  // For local images, return as is
  if (url.startsWith('/')) return url;
  
  // For external URLs, use our proxy API
  if (url.startsWith('http') && useProxy) {
    // Add cache-busting parameter for browser caching
    const cacheBuster = `&_cb=${Date.now()}`;
    return `/api/proxy/image?url=${encodeURIComponent(url)}${cacheBuster}`;
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