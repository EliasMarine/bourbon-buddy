import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/supabase-auth';

// Create a Supabase client with service role key for admin operations
const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.SUPABASE_SERVICE_KEY || 
                     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                     
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

// Constants
const BUCKET_NAME = 'bourbon-buddy-prod';
const TEST_FILE_PATH = 'admin-test/test-file.txt';

export async function GET(request: NextRequest) {
  try {
    // Check if we're in development mode or if user is authorized
    const isDevMode = process.env.NODE_ENV !== 'production';
    
    if (!isDevMode) {
      // In production, check for admin user
      const user = await getCurrentUser();
      
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      // Check if user is admin (you'd need to implement this check based on your auth logic)
      const isAdmin = false; // TODO: Implement actual admin check
      
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
    }
    
    // Initialize Supabase client
    const supabase = createSupabaseAdmin();
    
    // Test connectivity
    const connectionTest = await supabase.from('_pgrst_reserved_dummy').select('*').limit(1);
    
    // Get list of buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to list buckets',
        details: bucketsError.message,
        connection: connectionTest.status === 200 ? 'OK' : 'Error'
      }, { status: 500 });
    }
    
    // Storage diagnostic results
    const diagnosticResults: Record<string, any> = {
      connection: {
        status: connectionTest.status === 200 ? 'OK' : 'Error',
        details: connectionTest.statusText
      },
      buckets: buckets || [],
      testResults: [],
      filesList: {},
      permissions: {}
    };
    
    // Check each bucket
    for (const bucket of buckets || []) {
      // List files in bucket
      try {
        const { data: files, error: filesError } = await supabase.storage
          .from(bucket.name)
          .list();
          
        diagnosticResults.filesList[bucket.name] = {
          files: files || [],
          error: filesError ? filesError.message : null
        };
      } catch (e) {
        diagnosticResults.filesList[bucket.name] = {
          error: e instanceof Error ? e.message : 'Unknown error'
        };
      }
      
      // Test permissions
      try {
        const testContent = `Test file created at ${new Date().toISOString()}`;
        const testFile = new Blob([testContent], { type: 'text/plain' });
        
        // Try to upload a test file
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket.name)
          .upload(TEST_FILE_PATH, testFile, {
            upsert: true
          });
          
        if (uploadError) {
          diagnosticResults.testResults.push({
            bucket: bucket.name,
            test: 'upload',
            success: false,
            error: uploadError.message
          });
        } else {
          diagnosticResults.testResults.push({
            bucket: bucket.name,
            test: 'upload',
            success: true,
            path: uploadData?.path
          });
          
          // Try to get the uploaded file
          const { data: downloadData, error: downloadError } = await supabase.storage
            .from(bucket.name)
            .download(TEST_FILE_PATH);
            
          diagnosticResults.testResults.push({
            bucket: bucket.name,
            test: 'download',
            success: !downloadError,
            error: downloadError ? downloadError.message : null,
            size: downloadData?.size || 0
          });
          
          // Try to delete the test file
          const { error: deleteError } = await supabase.storage
            .from(bucket.name)
            .remove([TEST_FILE_PATH]);
            
          diagnosticResults.testResults.push({
            bucket: bucket.name,
            test: 'delete',
            success: !deleteError,
            error: deleteError ? deleteError.message : null
          });
        }
      } catch (e) {
        diagnosticResults.testResults.push({
          bucket: bucket.name,
          test: 'upload',
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error'
        });
      }
    }
    
    // Try to create a new test bucket if our target bucket doesn't exist
    const targetBucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!targetBucketExists) {
      try {
        const { data: newBucket, error: createError } = await supabase.storage
          .createBucket(BUCKET_NAME, {
            public: true
          });
          
        diagnosticResults.testResults.push({
          test: 'create-bucket',
          bucket: BUCKET_NAME,
          success: !createError,
          error: createError ? createError.message : null,
          data: newBucket
        });
      } catch (e) {
        diagnosticResults.testResults.push({
          test: 'create-bucket',
          bucket: BUCKET_NAME,
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: diagnosticResults
    });
  } catch (error) {
    console.error('Error in storage diagnostics:', error);
    return NextResponse.json({
      success: false,
      error: 'Exception during storage diagnostics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 