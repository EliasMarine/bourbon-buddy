import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use SUPABASE_SERVICE_ROLE_KEY as primary, with SUPABASE_SERVICE_KEY as fallback
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Check if required environment variables are present
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required Supabase environment variables in upload route');
  throw new Error('Missing Supabase configuration. Please check environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Safe error handler that prevents leaking sensitive information
function handleError(error: unknown) {
  // Log the full error for debugging but don't expose it to the client
  console.error('Upload error:', error instanceof Error 
    ? { message: error.message, name: error.name } 
    : 'Unknown error');
  
  // Return a generic error message to the client
  return NextResponse.json(
    { error: 'Failed to upload file' },
    { status: 500 }
  );
}

// POST /api/upload - Handle file uploads
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPG, PNG, GIF and WebP images are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File size exceeds 5MB limit.' 
      }, { status: 400 });
    }

    // Generate a unique filename
    const fileExtension = file.name.split('.').pop();
    const randomName = crypto.randomBytes(32).toString('hex');
    const filePath = `user-uploads/${session.user.id}/${randomName}.${fileExtension}`;

    // Get the file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('bourbon-buddy-uploads')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error.message);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('bourbon-buddy-uploads')
      .getPublicUrl(filePath);

    return NextResponse.json({ 
      success: true, 
      url: urlData.publicUrl 
    });
  } catch (error) {
    return handleError(error);
  }
} 