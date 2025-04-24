#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { resolve } from 'path';
import Mux from '@mux/mux-node';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Import the CommonJS prisma-fix module
const { prisma, safePrismaQuery } = require('./prisma-fix.js');

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
    })) as Video[];

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
            id: video.muxAssetId as string,  // New ID is the Mux asset ID
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