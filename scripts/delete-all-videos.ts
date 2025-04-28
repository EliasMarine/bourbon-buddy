// scripts/delete-all-videos.ts
// This script deletes all videos from the database and their associated Mux assets.
// Run with: npx tsx scripts/delete-all-videos.ts

// Import PrismaClient directly - most reliable for scripts
import { PrismaClient } from '@prisma/client'
// Create a new instance for this script
const prisma = new PrismaClient()

import Mux from '@mux/mux-node'

// Initialize Mux client with credentials from environment variables
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

async function main() {
  console.log('🔍 Fetching all videos...')
  const videos = await prisma.video.findMany()
  if (!videos.length) {
    console.log('✅ No videos found. Nothing to delete.')
    return
  }
  console.log(`Found ${videos.length} videos. Starting deletion...`)

  for (const video of videos) {
    // Delete from Mux if asset exists
    if (video.muxAssetId) {
      try {
        await mux.video.assets.delete(video.muxAssetId)
        console.log(`🗑️ Deleted Mux asset: ${video.muxAssetId}`)
      } catch (err) {
        console.error(`⚠️ Failed to delete Mux asset: ${video.muxAssetId}`, err)
      }
    }
    // Delete from DB
    try {
      await prisma.video.delete({ where: { id: video.id } })
      console.log(`🗑️ Deleted video: ${video.id}`)
    } catch (err) {
      console.error(`❌ Failed to delete video: ${video.id}`, err)
    }
  }
  console.log('✅ All videos deleted.')
}

main()
  .catch((err) => {
    console.error('❌ Error in delete-all-videos script:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 