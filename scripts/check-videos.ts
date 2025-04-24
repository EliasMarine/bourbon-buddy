import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Create a single PrismaClient instance
const prisma = new PrismaClient({
  log: ['error', 'warn', 'query'], // Log all queries for debugging
})

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  console.log(`Loading environment from ${envLocalPath}`)
  dotenv.config({ path: envLocalPath })
} else {
  console.log('No .env.local found, using default .env')
  dotenv.config()
}

async function checkVideos() {
  try {
    console.log('🎥 Checking video records in the database...')
    
    // Get total count
    const totalCount = await prisma.video.count()
    console.log(`\n📊 Found ${totalCount} total video records\n`)
    
    if (totalCount === 0) {
      console.log('❌ No videos found in the database')
      return
    }
    
    // Check for videos with missing playbackId
    const missingPlaybackId = await prisma.video.findMany({
      where: {
        OR: [
          { muxPlaybackId: null },
          { muxPlaybackId: '' },
        ]
      }
    })
    
    console.log(`\n🔍 Found ${missingPlaybackId.length} videos with missing playbackId\n`)
    if (missingPlaybackId.length > 0) {
      console.log('Sample of videos with missing playbackId:')
      missingPlaybackId.slice(0, 5).forEach((video, index) => {
        console.log(`${index + 1}. ID: ${video.id}, Title: ${video.title || 'No title'}, Status: ${video.status}`)
      })
    }
    
    // Check for specific video IDs from your logs
    const specificIds = [
      'cm9t2ecpr0000x7ajh5t08fnq',
      'cm9sr9i080000x7nw3eqmjyun',
      'cm9rwlabj0001x793eqpjsp8h',
      'cm9sqxfq50000x7ev9pjlqqmb'
    ]
    
    console.log(`\n🔍 Checking specific video IDs from your logs...\n`)
    
    for (const id of specificIds) {
      const video = await prisma.video.findUnique({
        where: { id }
      })
      
      if (video) {
        console.log(`✅ Video found for ID ${id}:`)
        console.log(`   Title: ${video.title || 'No title'}`)
        console.log(`   Status: ${video.status}`)
        console.log(`   MUX PlaybackId: ${video.muxPlaybackId || 'MISSING'}`)
        console.log(`   MUX AssetId: ${video.muxAssetId || 'MISSING'}`)
        console.log(`   Created: ${video.createdAt}`)
        console.log(`   Public: ${video.publiclyListed ? 'Yes' : 'No'}`)
        console.log(`   Views: ${video.views}`)
        console.log('')
      } else {
        console.log(`❌ No video found with ID: ${id}`)
      }
    }
    
    // Check video status counts
    const statuses = await prisma.$queryRaw`
      SELECT status, COUNT(*) as count 
      FROM "Video" 
      GROUP BY status
    `
    
    console.log(`\n📊 Video status breakdown:`)
    console.log(statuses)
    
    // Check for recently created videos
    const recentVideos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    console.log(`\n🕒 Most recent videos:`)
    recentVideos.forEach((video, index) => {
      console.log(`${index + 1}. ID: ${video.id}, Title: ${video.title || 'No title'}, Created: ${video.createdAt}, Status: ${video.status}`)
    })
    
  } catch (error) {
    console.error('Error checking videos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

console.log('🚀 Starting video check...')
checkVideos()
  .then(() => {
    console.log('✅ Video check complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error during video check:', error)
    process.exit(1)
  }) 