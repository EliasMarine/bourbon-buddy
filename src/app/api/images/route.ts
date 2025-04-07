import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create a Supabase client with service role key for server operations
// The service role key can bypass RLS policies
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket')
    const path = searchParams.get('path')

    // Validate parameters
    if (!bucket || !path) {
      return new NextResponse('Missing bucket or path parameters', { status: 400 })
    }

    // Download directly from Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path)

    if (error) {
      return new NextResponse(
        `Storage error: ${error.message}`, 
        { status: error.message.includes('not found') ? 404 : 500 }
      )
    }

    if (!data) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Get the file content as array buffer
    const buffer = await data.arrayBuffer()

    // Return the image with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 