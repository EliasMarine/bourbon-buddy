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
const BUCKET_NAME = 'bourbon-buddy-prod';

// Improved file type verification with better error logging and format detection
function verifyFileType(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    // Handle empty files
    if (file.size === 0) {
      console.error("File is empty, can't verify type");
      resolve(false);
      return;
    }
    
    // If the file is too small, we can't reliably detect its type
    if (file.size < 4) {
      console.error("File is too small for type verification");
      resolve(false);
      return;
    }
    
    // Extract file extension
    const fileExt = path.extname(file.name).toLowerCase();
    const expectedType = 
      fileExt === '.png' ? 'image/png' :
      fileExt === '.jpg' || fileExt === '.jpeg' ? 'image/jpeg' :
      fileExt === '.gif' ? 'image/gif' :
      fileExt === '.webp' ? 'image/webp' :
      file.type;
      
    // Log original and expected types
    console.log(`File type verification - Declared: ${file.type}, Expected from extension: ${expectedType}`);
    
    try {
      const reader = new FileReader();
      
      reader.onloadend = (e) => {
        try {
          if (!e.target?.result) {
            console.error("File reader result is empty");
            resolve(false);
            return;
          }
          
          // Read more bytes to better detect file types
          const arr = new Uint8Array(e.target.result as ArrayBuffer);
          if (arr.length === 0) {
            console.error("No bytes read from file");
            resolve(false);
            return;
          }
          
          // Get header as hex for logging
          const header = Array.from(arr.subarray(0, 16)).map(b => b.toString(16).padStart(2, '0')).join('');
          console.log(`File header (hex): ${header}`);
          
          // Detected format from header
          let detectedFormat = '';
          let isValid = false;
          
          // JPEG: FF D8 FF (many variations exist in the wild)
          if (arr[0] === 0xFF && arr[1] === 0xD8) {
            detectedFormat = 'image/jpeg';
            isValid = file.type === 'image/jpeg' || expectedType === 'image/jpeg';
            console.log(`JPEG signature detected: ${header.substring(0, 6)}`);
          } 
          // PNG: 89 50 4E 47 0D 0A 1A 0A
          else if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47 && 
                   arr[4] === 0x0D && arr[5] === 0x0A && arr[6] === 0x1A && arr[7] === 0x0A) {
            detectedFormat = 'image/png';
            isValid = file.type === 'image/png' || expectedType === 'image/png';
            console.log(`PNG signature detected: ${header.substring(0, 16)}`);
          } 
          // GIF: GIF87a (47 49 46 38 37 61) or GIF89a (47 49 46 38 39 61)
          else if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 && 
                   arr[3] === 0x38 && (arr[4] === 0x37 || arr[4] === 0x39) && arr[5] === 0x61) {
            detectedFormat = 'image/gif';
            isValid = file.type === 'image/gif' || expectedType === 'image/gif';
            console.log(`GIF signature detected: ${header.substring(0, 12)}`);
          } 
          // WebP: RIFF followed by WEBP at offset 8
          else if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 && 
                   arr.length >= 12 && arr[8] === 0x57 && arr[9] === 0x45 && 
                   arr[10] === 0x42 && arr[11] === 0x50) {
            detectedFormat = 'image/webp';
            isValid = file.type === 'image/webp' || expectedType === 'image/webp';
            console.log(`WebP signature detected: RIFF header and WEBP marker`);
          }
          
          // If we couldn't detect format but MIME type is allowed, be lenient in dev
          if (!isValid && detectedFormat === '' && ALLOWED_MIME_TYPES.includes(file.type)) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`Could not verify file type but allowing it in development: ${file.type}`);
              isValid = true;
            } else {
              console.error(`Failed to detect file format, but declared MIME type is allowed: ${file.type}`);
            }
          }
          
          // If file extension and content type don't match but both are allowed, be lenient
          if (!isValid && detectedFormat !== '' && ALLOWED_MIME_TYPES.includes(detectedFormat)) {
            console.log(`File content (${detectedFormat}) and declared type (${file.type}) mismatch, but both are allowed formats`);
            
            // In development, be more permissive
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`Allowing file type mismatch in development. Content: ${detectedFormat}, Declared: ${file.type}`);
              isValid = true;
            } else if (ALLOWED_MIME_TYPES.includes(file.type)) {
              // In production, if both types are allowed, still accept it but log a warning
              console.warn(`Accepting mismatched but allowed file type in production. Content: ${detectedFormat}, Declared: ${file.type}`);
              isValid = true;
            }
          }
          
          // Development fallback - accept any file with allowed extension or mimetype
          if (!isValid && process.env.NODE_ENV !== 'production') {
            const hasAllowedExt = ALLOWED_EXTENSIONS.includes(fileExt);
            const hasAllowedMime = ALLOWED_MIME_TYPES.includes(file.type);
            
            if (hasAllowedExt || hasAllowedMime) {
              console.warn(`Bypassing strict validation in development. Extension: ${fileExt}, MIME: ${file.type}`);
              isValid = true;
            }
          }
          
          console.log(`File validation result: ${isValid ? 'Valid' : 'Invalid'}, Detected: ${detectedFormat || 'unknown'}`);
          resolve(isValid);
        } catch (err) {
          console.error("Error during file signature check:", err);
          // In development, allow files even if validation fails
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Allowing file in development despite validation error');
            resolve(true);
          } else {
            resolve(false);
          }
        }
      };
      
      reader.onerror = (err) => {
        console.error("FileReader error:", err);
        resolve(false);
      };
      
      // Read the first chunk of the file - enough to detect type signatures
      reader.readAsArrayBuffer(file.slice(0, 16));
    } catch (err) {
      console.error("Error setting up file reader:", err);
      resolve(false);
    }
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
    console.log('CSRF token received:', csrfToken ? 'Present' : 'Missing');
    
    // ALWAYS bypass CSRF in development mode
    const bypassCsrf = process.env.NODE_ENV !== 'production' || process.env.BYPASS_CSRF === 'true';
    console.log('CSRF validation bypassed:', bypassCsrf);
    
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
      console.error('Authentication required for upload API');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // Get the user ID for folder structure
    const userId = user.id;
    
    // Parse the form data
    const formData = await request.formData();
    console.log('FormData entries:', Array.from(formData.entries()).map(([key]) => key));
    
    const file = formData.get('file') as File;
    
    // Validate the file exists
    if (!file) {
      console.error('No file provided in upload request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    console.log('File info:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: new Date(file.lastModified).toISOString()
    });
    
    // Check if file is empty
    if (file.size === 0) {
      console.error('File is empty (0 bytes)');
      return NextResponse.json(
        { error: 'File is empty or corrupted' },
        { status: 400 }
      );
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      console.error(`File size (${file.size}) exceeds limit (${MAX_FILE_SIZE})`);
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
    
    // Check MIME type - but be more lenient if extension is valid
    const isExtensionValid = ALLOWED_EXTENSIONS.includes(fileExtension);
    
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !isExtensionValid) {
      console.error(`Invalid MIME type: ${file.type} and extension: ${fileExtension}`);
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Prepare a fixed file type based on extension if needed
    let processedFile = file;
    if (isExtensionValid && !ALLOWED_MIME_TYPES.includes(file.type)) {
      // Fix MIME type based on extension
      const correctMimeType = 
        fileExtension === '.png' ? 'image/png' :
        fileExtension === '.jpg' || fileExtension === '.jpeg' ? 'image/jpeg' :
        fileExtension === '.gif' ? 'image/gif' :
        fileExtension === '.webp' ? 'image/webp' :
        file.type;
        
      console.log(`Fixing MIME type based on extension. Original: ${file.type}, New: ${correctMimeType}`);
      
      try {
        // Create a new file with the correct MIME type
        processedFile = new File([file], file.name, { 
          type: correctMimeType,
          lastModified: file.lastModified 
        });
      } catch (error) {
        console.warn("Failed to create new File with corrected MIME type:", error);
        // Continue with original file
      }
    }
    
    // Verify that file content matches its declared type
    const isValidType = await verifyFileType(processedFile);
    if (!isValidType) {
      console.error('File content validation failed');
      
      // In development mode, allow the upload despite validation failure as a fallback
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Allowing file upload in development despite content validation failure');
      } else {
        return NextResponse.json(
          { error: 'File content does not match declared type' },
          { status: 400 }
        );
      }
    }
    
    // Scan file for viruses/malware
    const isClean = await scanForViruses(processedFile);
    if (!isClean) {
      console.error('File failed security scan');
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
    
    console.log('Available buckets:', buckets?.map(b => b.name) || []);
    
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`Bucket ${BUCKET_NAME} does not exist. Creating it...`);
      try {
        const { data: newBucket, error: createBucketError } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
          allowedMimeTypes: ALLOWED_MIME_TYPES
        });
        
        if (createBucketError) {
          console.error('Error creating bucket:', createBucketError);
          return NextResponse.json(
            { error: `Failed to create storage bucket: ${createBucketError.message}` },
            { status: 500 }
          );
        }
        
        console.log('Successfully created bucket:', newBucket);
        
        // Update bucket public access
        try {
          // Make the bucket public by updating its options
          const { error: updateError } = await supabase.storage.updateBucket(BUCKET_NAME, {
            public: true,
            fileSizeLimit: MAX_FILE_SIZE,
            allowedMimeTypes: ALLOWED_MIME_TYPES
          });
          
          if (updateError) {
            console.warn('Error updating bucket to public (continuing anyway):', updateError);
          } else {
            console.log('Successfully updated bucket to be public');
          }
        } catch (policyError) {
          console.warn('Error setting bucket to public (continuing anyway):', policyError);
        }
      } catch (e) {
        console.error('Unexpected error creating bucket:', e);
        return NextResponse.json(
          { error: 'Failed to create storage bucket due to an unexpected error' },
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
    
    console.log('Uploading file to:', {
      bucket: BUCKET_NAME,
      path: filePath,
      contentType: processedFile.type
    });
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, processedFile, {
        contentType: processedFile.type,
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
      console.error('Failed to get public URL');
      return NextResponse.json(
        { error: 'Failed to get public URL for uploaded file' },
        { status: 500 }
      );
    }
    
    console.log('Upload successful:', {
      publicUrl: urlData.publicUrl
    });
    
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