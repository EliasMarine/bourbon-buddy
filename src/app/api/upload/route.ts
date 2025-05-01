import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/supabase-auth';
// Removed authOptions import - not needed with Supabase Auth;
import { v4 as uuidv4 } from 'uuid';
import { uploadLimiter } from '@/lib/rate-limiters';
import { validateCsrfToken } from '@/lib/csrf';
import path from 'path';
import { createHash } from 'crypto';
import { verifyFileType } from '@/lib/file-validation';

// Create a Supabase client with service role key for server operations
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

// Initialize on demand
let supabaseClient: SupabaseClient | null = null;

const getSupabase = (): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = createSupabaseAdmin();
  }
  return supabaseClient;
}

// Define constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const BUCKET_NAME = 'bourbon-buddy-prod'; // Changed to match the bucket in logs

// Dummy virus scanner function (in production, connect to a real service)
async function scanForViruses(file: File): Promise<boolean> {
  // In production, use a real virus scanning service
  // This is a placeholder that just checks if file size is reasonable
  // and has a proper extension, etc.
  
  // Calculate file hash - useful for comparing against known malware hashes
  // or for deduplication in a real implementation
  const buffer = await file.arrayBuffer();
  const hash = createHash('sha256').update(Buffer.from(buffer)).digest('hex');
  
  console.log(`File scan completed: ${file.name}, size: ${file.size}, hash: ${hash}`);
  
  // For this demo, we're just assuming all valid files are clean
  return true;
}

// Test Supabase connectivity
async function testSupabaseConnection() {
  try {
    const supabase = getSupabase();
    
    // Test storage by listing buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Supabase storage connection error:', bucketsError);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Supabase connection test exception:', err);
    return false;
  }
}

// Ensure the storage bucket exists
async function ensureBucketExists(bucketName: string): Promise<boolean> {
  try {
    console.log(`Checking if bucket ${bucketName} exists...`);
    const supabase = getSupabase();
    
    // First, check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    // If bucket doesn't exist, create it
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} does not exist. Creating it...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return false;
      }
      
      console.log(`Bucket ${bucketName} created successfully`);
    } else {
      console.log(`Bucket ${bucketName} already exists`);
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API called');
    
    // Test Supabase connectivity
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.error('Supabase connection test failed');
      return NextResponse.json(
        { error: 'Storage service unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    
    // Ensure the bucket exists
    const bucketReady = await ensureBucketExists(BUCKET_NAME);
    if (!bucketReady) {
      return NextResponse.json(
        { error: 'Failed to prepare storage bucket. Please try again later.' },
        { status: 500 }
      );
    }
    
    // Skip rate limiting for now as this is a low-volume endpoint for profile photos
    
    // Get CSRF token from request headers
    const csrfToken = request.headers.get('x-csrf-token');
    
    // ALWAYS bypass CSRF in development mode
    const bypassCsrf = process.env.NODE_ENV !== 'production' || process.env.BYPASS_CSRF === 'true';
    
    // Only validate CSRF in production
    if (!bypassCsrf) {
      // Check for CSRF token
      if (!csrfToken) {
        console.warn('Missing CSRF token in upload request');
        return NextResponse.json(
          { error: 'Missing CSRF token' },
          { status: 403 }
        );
      }
      
      // Validate CSRF token
      if (!validateCsrfToken(request, csrfToken)) {
        console.error('Invalid CSRF token for upload request');
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    } else {
      console.log('CSRF validation bypassed in development mode');
    }
    
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      console.error('Authentication required for upload');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the user ID for folder structure
    const userId = user.id;
    console.log(`Upload request from user: ${userId}`);
    
    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Validate the file exists
    if (!file) {
      console.error('No file provided in upload request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    console.log(`Processing file upload: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      console.error(`File size exceeds limit: ${file.size} bytes`);
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }
    
    // Extract file extension and check against allowed extensions
    const fileExtension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      console.error(`Invalid file extension: ${fileExtension}`);
      return NextResponse.json(
        { error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check MIME type, but handle special cases (especially for PNG files)
    let contentType = file.type;
    let adjustedMimeType = false;
    
    // If MIME type doesn't match extension, try to fix it
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      console.warn(`File MIME type ${contentType} not in allowed list. Checking file extension...`);
      
      // Determine correct MIME type from extension
      const correctMimeType = 
        fileExtension === '.png' ? 'image/png' :
        fileExtension === '.jpg' || fileExtension === '.jpeg' ? 'image/jpeg' :
        fileExtension === '.gif' ? 'image/gif' :
        fileExtension === '.webp' ? 'image/webp' :
        null;
        
      if (correctMimeType) {
        console.log(`Adjusting MIME type from ${contentType} to ${correctMimeType} based on file extension ${fileExtension}`);
        contentType = correctMimeType;
        adjustedMimeType = true;
      } else {
        console.error(`Invalid file type: ${contentType}`);
        return NextResponse.json(
          { error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` },
          { status: 400 }
        );
      }
    }
    
    // Verify that file content matches its declared type
    console.log('Verifying file content matches declared type...');
    const isValidType = await verifyFileType(file);
    if (!isValidType) {
      // Special diagnostic for PNG files when validation fails
      if (fileExtension === '.png' || contentType === 'image/png') {
        // Read file header for detailed logging
        const buffer = await file.arrayBuffer();
        const arr = new Uint8Array(buffer).slice(0, 16);
        const header = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        
        console.error('PNG validation failed with details:', {
          fileSize: file.size,
          declaredMimeType: file.type,
          adjustedMimeType: adjustedMimeType ? contentType : 'No adjustment',
          extension: fileExtension,
          headerHex: header,
          expectedPngHeader: '89504e470d0a1a0a'
        });
        
        // Return detailed error for troubleshooting
        return NextResponse.json(
          { 
            error: 'File content does not match expected PNG format',
            details: {
              expectedHeader: '89504e470d0a1a0a',
              actualHeader: header.substring(0, 16),
              note: 'The file should be a valid PNG image, not a renamed file'
            }
          },
          { status: 400 }
        );
      }
      
      console.error('File content does not match declared type');
      return NextResponse.json(
        { error: 'File content does not match declared type. Please ensure you are uploading a valid image file.' },
        { status: 400 }
      );
    }
    
    // Scan file for viruses/malware
    const isClean = await scanForViruses(file);
    if (!isClean) {
      console.error('File failed security scan');
      return NextResponse.json(
        { error: 'File failed security scan' },
        { status: 400 }
      );
    }
    
    // Create a unique filename - use UUID and timestamp for unpredictability 
    const timestamp = Date.now();
    const randomId = uuidv4().replace(/-/g, '');
    const fileName = `${timestamp}-${randomId}${fileExtension}`;
    
    // The path in the bucket where the file will be stored - user-specific paths for isolation
    const filePath = `user-uploads/${userId}/${fileName}`;
    console.log(`Preparing to upload to: ${BUCKET_NAME}/${filePath}`);
    
    const supabase = getSupabase();
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: contentType,
        upsert: false, // Don't overwrite existing files with same name
      });
    
    if (error) {
      console.error('Supabase storage upload error:', error);
      return NextResponse.json(
        { error: `Failed to upload file: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log(`File uploaded successfully: ${filePath}`);
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
      
    if (!urlData?.publicUrl) {
      console.error('Failed to get public URL');
      return NextResponse.json(
        { error: 'Failed to get public URL for uploaded file' },
        { status: 500 }
      );
    }
    
    console.log(`Generated public URL: ${urlData.publicUrl}`);
    
    // Return the URL and path information
    return NextResponse.json({
      url: urlData.publicUrl,
      bucket: BUCKET_NAME,
      path: filePath,
      success: true
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    );
  }
} 