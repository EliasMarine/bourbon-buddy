import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getTableNames, getColumnInfo } from '@/lib/supabase-server'

/**
 * API route to inspect database tables and columns
 * Useful for debugging DB schema issues
 */
export async function GET(request: NextRequest) {
  // Check for a token to prevent unauthorized access
  const token = request.nextUrl.searchParams.get('token')
  if (token !== process.env.DEBUG_API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    // 1. Check if the SUPABASE_SERVICE_ROLE_KEY is set and valid
    const isKeyValid = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && 
                          process.env.SUPABASE_SERVICE_ROLE_KEY.length > 10)
    
    // 2. Get all table names to diagnose casing issues
    const tables = await getTableNames()
    
    // 3. Check for the Video table in various case forms
    const videoTableInfo = await getColumnInfo('Video')
    const videoLowercaseInfo = await getColumnInfo('video')
    
    // 4. Test a simple select query with both casings
    const capitalQuery = await supabaseAdmin
      .from('Video')
      .select('count(*)', { count: 'exact', head: true })
    
    const lowercaseQuery = await supabaseAdmin
      .from('video')
      .select('count(*)', { count: 'exact', head: true })
    
    // 5. Return all diagnostics info
    return NextResponse.json({
      serviceRoleKey: {
        isSet: isKeyValid,
        firstChars: isKeyValid ? process.env.SUPABASE_SERVICE_ROLE_KEY!.substring(0, 3) + '...' : null
      },
      tables,
      columns: {
        Video: videoTableInfo,
        video: videoLowercaseInfo
      },
      queryResults: {
        Video: {
          success: !capitalQuery.error,
          error: capitalQuery.error ? capitalQuery.error.message : null,
          count: capitalQuery.count
        },
        video: {
          success: !lowercaseQuery.error,
          error: lowercaseQuery.error ? lowercaseQuery.error.message : null,
          count: lowercaseQuery.count
        }
      }
    })
  } catch (error) {
    console.error('Error in inspect-tables API route:', error)
    return NextResponse.json(
      { error: 'Error inspecting tables', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 