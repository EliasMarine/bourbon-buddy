#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { resolve } from 'path';
import Mux from '@mux/mux-node';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { prisma, safePrismaQuery } from './prisma-fix.mjs';

// Get the current filename and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Initialize Mux client
const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || '',
  tokenSecret: process.env.MUX_TOKEN_SECRET || '',
});

// Define Video interface to match database schema
interface Video {
  id: string;
  title: string;
  description: string | null;
  status: string;
  muxUploadId: string | null;
  muxAssetId: string | null;
  muxPlaybackId: string | null;
  duration: number | null;
  aspectRatio: string | null;
  thumbnailTime: number | null;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  publiclyListed: boolean;
  views: number;
}

// Define asset info interface
interface AssetInfo {
  playbackId: string;
  status: string;
  duration?: number;
  aspectRatio?: string;
}

async function syncMuxAssets() {
  console.log('🔄 Starting Mux asset synchronization...');

  try {
    // Fetch all assets from Mux
    const muxAssets = await muxClient.video.assets.list();
    console.log(`📊 Found ${muxAssets.data.length} assets in Mux`);

    // Create a map of asset IDs to playback IDs
    const assetMap = new Map<string, AssetInfo>();
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
    })) as Video[];
    console.log(`📊 Found ${dbVideos.length} videos in database`);

    // Videos that need updating
    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    // Update database records that have an asset ID but missing playback ID
    for (const video of dbVideos) {
      if (video.muxAssetId && assetMap.has(video.muxAssetId)) {
        const assetInfo = assetMap.get(video.muxAssetId)!;
        
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
    console.log(`�� Updated: ${updated}, Skipped: ${skipped}, Not Found: ${notFound}`);
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