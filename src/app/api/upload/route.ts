import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/supabase-auth';
// Removed authOptions import - not needed with Supabase Auth;
import { v4 as uuidv4 } from 'uuid';
import { uploadLimiter } from '@/lib/rate-limiters';
import { validateCsrfToken } from '@/lib/csrf';
import path from 'path';
import { createHash } from 'crypto';

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
const BUCKET_NAME = 'bourbon-buddy-uploads';

// Simple content type verification - verifies file content against declared MIME type
function verifyFileType(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      const arr = new Uint8Array(e.target?.result as ArrayBuffer).subarray(0, 4);
      const header = Array.from(arr).map(b => b.toString(16)).join('');
      
      // Check file signatures
      let isValid = false;
      
      if (file.type === 'image/jpeg' && (header.startsWith('ffd8') || header.startsWith('ffd9'))) {
        isValid = true;
      } else if (file.type === 'image/png' && header === '89504e47') {
        isValid = true;
      } else if (file.type === 'image/gif' && (header === '47494638' || header.startsWith('4749'))) {
        isValid = true;
      } else if (file.type === 'image/webp' && header.includes('5745')) {
        isValid = true;
      }
      
      resolve(isValid);
    };
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
}

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

export async function POST(request: NextRequest) {
  try {
    // Test Supabase connectivity
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.error('Supabase connection test failed');
      return NextResponse.json(
        { error: 'Storage service unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    
    // Apply rate limiting with safe fallback
    try {
      if (uploadLimiter && typeof uploadLimiter.check === 'function') {
        const limiterResponse = await uploadLimiter.check(request);
        if (limiterResponse.statusCode === 429) {
          return NextResponse.json(
            { error: 'Too many file uploads. Please try again later.' },
            { status: 429 }
          );
        }
      } else {
        // Fallback if check doesn't exist
        console.warn('Upload rate limiter check function not available - skipping rate limiting');
      }
    } catch (rateLimitError) {
      // Don't block upload on rate limiter errors, just log them
      console.error('Rate limiter error:', rateLimitError);
    }
    
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
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the user ID for folder structure
    const userId = user.id;
    
    // Parse the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Validate the file exists
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }
    
    // Extract file extension and check against allowed extensions
    const fileExtension = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Verify that file content matches its declared type
    const isValidType = await verifyFileType(file);
    if (!isValidType) {
      return NextResponse.json(
        { error: 'File content does not match declared type' },
        { status: 400 }
      );
    }
    
    // Scan file for viruses/malware
    const isClean = await scanForViruses(file);
    if (!isClean) {
      return NextResponse.json(
        { error: 'File failed security scan' },
        { status: 400 }
      );
    }
    
    // Check if bucket exists and create it if not
    const supabase = getSupabase();
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return NextResponse.json(
        { error: 'Failed to access storage: ' + bucketsError.message },
        { status: 500 }
      );
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`Bucket ${BUCKET_NAME} does not exist. Creating it...`);
      const { error: createBucketError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
      });
      
      if (createBucketError) {
        console.error('Error creating bucket:', createBucketError);
        return NextResponse.json(
          { error: `Failed to create storage bucket: ${createBucketError.message}` },
          { status: 500 }
        );
      }
    }
    
    // Create a unique filename - use UUID and timestamp for unpredictability 
    const timestamp = Date.now();
    const randomId = uuidv4().replace(/-/g, '');
    const fileName = `${timestamp}-${randomId}${fileExtension}`;
    
    // The path in the bucket where the file will be stored - user-specific paths for isolation
    const filePath = `user-uploads/${userId}/${fileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files with same name
      });
    
    if (error) {
      console.error('Supabase storage upload error:', error);
      return NextResponse.json(
        { error: `Failed to upload file: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
      
    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'Failed to get public URL for uploaded file' },
        { status: 500 }
      );
    }
    
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