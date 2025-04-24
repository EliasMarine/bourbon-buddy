// This script fetches videos directly from MUX and updates the database
// with the correct playback IDs and asset information

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import Mux from '@mux/mux-node';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('No .env.local found, using default .env');
  dotenv.config();
}

// Initialize Prisma
const prisma = new PrismaClient({
  log: ['error', 'warn']
});

// Initialize MUX client
const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET
});

// The Assets API is under muxClient.video.assets, not Video.Assets
const { video } = muxClient;

if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  console.error('❌ MUX_TOKEN_ID and MUX_TOKEN_SECRET environment variables are required');
  process.exit(1);
}

// Create a new video in the database with MUX information
async function createOrUpdateVideoFromAsset(asset) {
  // Only process ready assets with playback IDs
  if (asset.status !== 'ready' || !asset.playback_ids || asset.playback_ids.length === 0) {
    console.log(`⚠️ Skipping asset ${asset.id} - not ready or no playback IDs`);
    return false;
  }

  const playbackId = asset.playback_ids[0].id;
  
  try {
    // Check if we already have this asset in our database
    const existingVideo = await prisma.video.findFirst({
      where: { 
        OR: [
          { muxAssetId: asset.id },
          { muxPlaybackId: playbackId }
        ]
      }
    });

    if (existingVideo) {
      // Update existing video record with latest MUX data
      const updated = await prisma.video.update({
        where: { id: existingVideo.id },
        data: {
          muxAssetId: asset.id,
          muxPlaybackId: playbackId,
          status: 'ready',
          duration: asset.duration || existingVideo.duration,
          aspectRatio: asset.aspect_ratio || existingVideo.aspectRatio
        }
      });
      console.log(`✅ Updated existing video ${existingVideo.id} with playback ID: ${playbackId}`);
      return updated;
    } else {
      // No matching record, create a new video entry
      // Using a default title based on the asset ID
      const newVideo = await prisma.video.create({
        data: {
          title: `MUX Video (${asset.id})`,
          description: `Video imported from MUX asset ${asset.id}`,
          status: 'ready',
          muxAssetId: asset.id,
          muxPlaybackId: playbackId,
          duration: asset.duration || 0,
          aspectRatio: asset.aspect_ratio || '16:9',
          publiclyListed: true,
          views: 0
        }
      });
      console.log(`✅ Created new video record for MUX asset ${asset.id} with playback ID: ${playbackId}`);
      return newVideo;
    }
  } catch (error) {
    console.error(`❌ Error processing MUX asset ${asset.id}:`, error);
    return false;
  }
}

// Fix any database records that have missing playback IDs
async function fixMissingPlaybackIds() {
  try {
    console.log('🔍 Checking for videos with missing playback IDs...');
    
    const missingPlaybackIds = await prisma.video.findMany({
      where: {
        OR: [
          { muxPlaybackId: null },
          { muxPlaybackId: '' }
        ],
        AND: {
          muxAssetId: { not: null }
        }
      }
    });
    
    console.log(`📊 Found ${missingPlaybackIds.length} videos with asset IDs but missing playback IDs`);
    
    if (missingPlaybackIds.length === 0) {
      return;
    }
    
    // Fetch all assets from MUX
    console.log('🔄 Fetching assets from MUX...');
    const muxAssets = await video.assets.list();
    
    // Create a map of asset IDs to assets
    const assetMap = new Map();
    for (const asset of muxAssets.data) {
      assetMap.set(asset.id, asset);
    }
    
    let fixedCount = 0;
    let notFoundCount = 0;
    
    // Update each video with missing playback ID
    for (const video of missingPlaybackIds) {
      if (video.muxAssetId && assetMap.has(video.muxAssetId)) {
        const asset = assetMap.get(video.muxAssetId);
        
        if (asset.playback_ids && asset.playback_ids.length > 0) {
          const playbackId = asset.playback_ids[0].id;
          
          await prisma.video.update({
            where: { id: video.id },
            data: {
              muxPlaybackId: playbackId,
              status: asset.status === 'ready' ? 'ready' : video.status
            }
          });
          
          console.log(`✅ Fixed video ${video.id} with playback ID: ${playbackId}`);
          fixedCount++;
        } else {
          console.log(`⚠️ Asset ${video.muxAssetId} has no playback IDs`);
          notFoundCount++;
        }
      } else {
        console.log(`⚠️ Video ${video.id} has asset ID ${video.muxAssetId} but not found in MUX`);
        notFoundCount++;
      }
    }
    
    console.log(`📊 Fixed ${fixedCount} videos, ${notFoundCount} not found in MUX`);
  } catch (error) {
    console.error('❌ Error fixing missing playback IDs:', error);
  }
}

// Check for videos in the database that don't exist in MUX
async function findOrphanedVideos(muxAssets) {
  try {
    // Get all videos with muxAssetId
    const dbVideos = await prisma.video.findMany({
      where: {
        muxAssetId: { not: null }
      },
      select: {
        id: true,
        title: true,
        muxAssetId: true
      }
    });
    
    console.log(`📊 Found ${dbVideos.length} videos with MUX asset IDs in database`);
    
    // Create a set of MUX asset IDs
    const muxAssetIds = new Set(muxAssets.data.map(asset => asset.id));
    
    // Find videos with asset IDs that don't exist in MUX
    const orphanedVideos = dbVideos.filter(video => 
      video.muxAssetId && !muxAssetIds.has(video.muxAssetId)
    );
    
    if (orphanedVideos.length > 0) {
      console.log(`⚠️ Found ${orphanedVideos.length} videos with MUX asset IDs that don't exist in MUX:`);
      orphanedVideos.forEach(video => {
        console.log(`   - ${video.id}: "${video.title}" (MUX asset: ${video.muxAssetId})`);
      });
    } else {
      console.log('✅ No orphaned videos found');
    }
  } catch (error) {
    console.error('❌ Error finding orphaned videos:', error);
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting MUX video update process...');
    
    // Fetch all assets from MUX
    console.log('🔄 Fetching assets from MUX...');
    const muxAssets = await video.assets.list();
    
    console.log(`📊 Found ${muxAssets.data.length} assets in MUX`);
    
    // Process each asset from MUX
    let processed = 0;
    for (const asset of muxAssets.data) {
      if (await createOrUpdateVideoFromAsset(asset)) {
        processed++;
      }
    }
    
    console.log(`📊 Processed ${processed} out of ${muxAssets.data.length} MUX assets`);
    
    // Fix any videos with missing playback IDs
    await fixMissingPlaybackIds();
    
    // Check for orphaned videos (in DB but not in MUX)
    await findOrphanedVideos(muxAssets);
    
    console.log('✅ MUX video update process completed successfully');
  } catch (error) {
    console.error('❌ Error during MUX video update process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }); 