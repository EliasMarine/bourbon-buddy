import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getTableNames } from '@/lib/supabase-server'

/**
 * API route to fix the Video table casing issues
 * This will create a proper Video table (capital V) if needed
 */
export async function POST(request: NextRequest) {
  // Check for a token to prevent unauthorized access
  const token = request.nextUrl.searchParams.get('token')
  if (token !== process.env.DEBUG_API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    // Get all tables to check if Video or video exists
    const tables = await getTableNames()
    
    // Check for the Video table (capital V)
    const hasCapitalVideo = tables?.includes('Video') ?? false
    
    // Check for the video table (lowercase v)
    const hasLowercaseVideo = tables?.includes('video') ?? false
    
    // We'll track our operations
    const operations: Array<{action: string; success: boolean; error: string | null}> = []
    
    // If neither exists, create the Video table
    if (!hasCapitalVideo && !hasLowercaseVideo) {
      console.log('Creating new Video table from scratch')
      
      try {
        await supabaseAdmin.rpc('execute_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS "Video" (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              title TEXT NOT NULL,
              description TEXT,
              status TEXT NOT NULL DEFAULT 'uploading',
              "muxUploadId" TEXT UNIQUE,
              "muxAssetId" TEXT UNIQUE,
              "muxPlaybackId" TEXT,
              duration FLOAT,
              "aspectRatio" TEXT,
              "thumbnailTime" FLOAT DEFAULT 0,
              "userId" UUID,
              "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              "publiclyListed" BOOLEAN DEFAULT TRUE,
              views INTEGER DEFAULT 0
            );
          `
        })
        
        operations.push({
          action: 'Create Table',
          success: true,
          error: null
        })
      } catch (error) {
        operations.push({
          action: 'Create Table',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
    
    // If lowercase video exists but capital doesn't, rename it
    if (!hasCapitalVideo && hasLowercaseVideo) {
      console.log('Renaming video table to Video (lowercase to capital)')
      
      try {
        await supabaseAdmin.rpc('execute_sql', {
          sql: `
            ALTER TABLE "video" RENAME TO "Video";
          `
        })
        
        operations.push({
          action: 'Rename Table',
          success: true, 
          error: null
        })
      } catch (error) {
        operations.push({
          action: 'Rename Table',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
    
    // If both exist, we'll keep both but ensure the Video (capital) has the right columns
    if (hasCapitalVideo) {
      console.log('Ensuring Video table has proper columns')
      
      try {
        await supabaseAdmin.rpc('execute_sql', {
          sql: `
            -- Make sure these columns exist with correct names
            DO $$ 
            BEGIN
              -- Add muxUploadId if it doesn't exist
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'Video' AND column_name = 'muxUploadId') THEN
                ALTER TABLE "Video" ADD COLUMN "muxUploadId" TEXT UNIQUE;
              END IF;
              
              -- Add muxAssetId if it doesn't exist
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'Video' AND column_name = 'muxAssetId') THEN
                ALTER TABLE "Video" ADD COLUMN "muxAssetId" TEXT UNIQUE;
              END IF;
              
              -- Add muxPlaybackId if it doesn't exist
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'Video' AND column_name = 'muxPlaybackId') THEN
                ALTER TABLE "Video" ADD COLUMN "muxPlaybackId" TEXT;
              END IF;
              
              -- Add userId if it doesn't exist
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'Video' AND column_name = 'userId') THEN
                ALTER TABLE "Video" ADD COLUMN "userId" UUID;
              END IF;
            END $$;
          `
        })
        
        operations.push({
          action: 'Update Columns',
          success: true,
          error: null
        })
      } catch (error) {
        operations.push({
          action: 'Update Columns',
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
    
    // Re-check tables after operations
    const updatedTables = await getTableNames()
    
    return NextResponse.json({
      operations,
      before: {
        tables,
        hasCapitalVideo,
        hasLowercaseVideo
      },
      after: {
        tables: updatedTables,
        hasCapitalVideo: updatedTables?.includes('Video') ?? false,
        hasLowercaseVideo: updatedTables?.includes('video') ?? false
      }
    })
  } catch (error) {
    console.error('Error fixing Video table:', error)
    return NextResponse.json(
      { error: 'Error fixing Video table', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 