import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Mux from '@mux/mux-node';
import { PrismaClient } from '@prisma/client';

// Get current file & directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize Mux client
const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || '',
  tokenSecret: process.env.MUX_TOKEN_SECRET || '',
});

/**
 * Executes a Prisma query with automatic retry for the "prepared statement already exists" error
 */
async function safePrismaQuery(queryFn) {
  try {
    // First attempt
    return await queryFn();
  } catch (error) {
    // Check if it's a "prepared statement already exists" error
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('prepared statement') && errorMessage.includes('already exists')) {
      console.warn('Encountered prepared statement error, attempting to deallocate and retry');
      
      try {
        // Attempt to deallocate all prepared statements
        await prisma.$executeRaw`DEALLOCATE ALL`;
        console.log('Successfully deallocated prepared statements');
      } catch (deallocError) {
        console.error('Failed to deallocate prepared statements:', deallocError);
      }
      
      try {
        // Disconnect and reconnect to clear the connection
        await prisma.$disconnect();
        console.log('Disconnected Prisma client');
        
        // Reconnect
        await prisma.$connect();
        console.log('Reconnected Prisma client');
        
        // Retry the query
        return await queryFn();
      } catch (retryError) {
        console.error('Error during retry after reconnection:', retryError);
        throw retryError;
      }
    }
    
    // If it's not a prepared statement error, or retry failed, rethrow
    throw error;
  }
}

/**
 * This script addresses a specific issue where videos in the database
 * have a UUID for their ID (e.g., cm9sr9i080000x7nw3eqmjyun) but they're 
 * supposed to be using the Mux asset ID from the linked video asset.
 */
async function fixVideoIds() {
  console.log('🔍 Scanning for video ID mismatches...');

  try {
    // Get all videos that have both Mux asset ID and Mux playback ID using safePrismaQuery
    const videos = await safePrismaQuery(() => prisma.video.findMany({
      where: {
        muxAssetId: { not: null },
        muxPlaybackId: { not: null },
      },
    }));

    console.log(`📊 Found ${videos.length} videos with Mux asset IDs to check`);

    // Check for videos where the ID doesn't match the Mux asset ID
    const mismatchedVideos = videos.filter(video => 
      video.id !== video.muxAssetId
    );

    console.log(`⚠️ Found ${mismatchedVideos.length} videos with mismatched IDs`);

    // Fix each mismatched video by creating new records with correct IDs
    for (const video of mismatchedVideos) {
      console.log(`🔄 Fixing video ${video.id} to use Mux asset ID: ${video.muxAssetId}`);

      try {
        // Create a new record with the correct ID (which is the Mux asset ID) using safePrismaQuery
        await safePrismaQuery(() => prisma.video.create({
          data: {
            id: video.muxAssetId,  // New ID is the Mux asset ID
            title: video.title,
            description: video.description,
            status: video.status,
            muxUploadId: video.muxUploadId,
            muxAssetId: video.muxAssetId,
            muxPlaybackId: video.muxPlaybackId,
            duration: video.duration,
            aspectRatio: video.aspectRatio,
            thumbnailTime: video.thumbnailTime,
            userId: video.userId,
            publiclyListed: video.publiclyListed,
            views: video.views,
            createdAt: video.createdAt,
            updatedAt: video.updatedAt,
          },
        }));

        console.log(`✅ Created new record with ID: ${video.muxAssetId}`);

        // Delete the old record using safePrismaQuery
        await safePrismaQuery(() => prisma.video.delete({
          where: { id: video.id },
        }));

        console.log(`🗑️ Deleted old record with ID: ${video.id}`);
      } catch (error) {
        console.error(`❌ Error fixing video ${video.id}:`, error);
      }
    }

    console.log('✅ ID mismatch fixing complete!');
  } catch (error) {
    console.error('❌ Error fixing video IDs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the ID fixing process
fixVideoIds()
  .then(() => {
    console.log('✅ Process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error in process:', error);
    process.exit(1);
  }); 