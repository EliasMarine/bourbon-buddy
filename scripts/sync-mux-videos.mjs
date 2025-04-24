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

async function syncMuxAssets() {
  console.log('🔄 Starting Mux asset synchronization...');

  try {
    // Fetch all assets from Mux
    const muxAssets = await muxClient.video.assets.list();
    console.log(`📊 Found ${muxAssets.data.length} assets in Mux`);

    // Create a map of asset IDs to playback IDs
    const assetMap = new Map();
    for (const asset of muxAssets.data) {
      if (asset.playback_ids && asset.playback_ids.length > 0) {
        assetMap.set(asset.id, {
          playbackId: asset.playback_ids[0].id,
          status: asset.status,
          duration: asset.duration,
          aspectRatio: asset.aspect_ratio
        });
      }
    }

    // Fetch all videos from database using safePrismaQuery
    const dbVideos = await safePrismaQuery(() => prisma.video.findMany({
      where: {
        OR: [
          { muxAssetId: { not: null } },
          { muxPlaybackId: null }
        ]
      }
    }));
    console.log(`📊 Found ${dbVideos.length} videos in database`);

    // Videos that need updating
    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    // Update database records that have an asset ID but missing playback ID
    for (const video of dbVideos) {
      if (video.muxAssetId && assetMap.has(video.muxAssetId)) {
        const assetInfo = assetMap.get(video.muxAssetId);
        
        if (!video.muxPlaybackId || video.muxPlaybackId !== assetInfo.playbackId) {
          console.log(`🔄 Updating video ${video.id} with playback ID: ${assetInfo.playbackId}`);
          
          // Use safePrismaQuery for the update
          await safePrismaQuery(() => prisma.video.update({
            where: { id: video.id },
            data: {
              muxPlaybackId: assetInfo.playbackId,
              status: assetInfo.status === 'ready' ? 'ready' : video.status,
              duration: assetInfo.duration || video.duration,
              aspectRatio: assetInfo.aspectRatio || video.aspectRatio
            }
          }));
          updated++;
        } else {
          skipped++;
        }
      } else if (video.muxAssetId) {
        console.log(`⚠️ Video ${video.id} has asset ID ${video.muxAssetId} but not found in Mux`);
        notFound++;
      }
    }

    console.log(`✅ Sync complete!`);
    console.log(`📊 Updated: ${updated}, Skipped: ${skipped}, Not Found: ${notFound}`);
  } catch (error) {
    console.error('❌ Error syncing Mux assets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the synchronization
syncMuxAssets()
  .then(() => {
    console.log('✅ Sync process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error in sync process:', error);
    process.exit(1);
  }); 