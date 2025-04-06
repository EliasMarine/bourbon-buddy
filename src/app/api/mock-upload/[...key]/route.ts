import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Safe error handler that prevents leaking sensitive information
function handleError(error: unknown) {
  // Log the full error for debugging but don't expose it to the client
  console.error('Upload error:', error instanceof Error 
    ? { message: error.message, name: error.name } 
    : 'Unknown error');
  
  // Return a generic error message to the client
  return NextResponse.json(
    { error: 'Error handling file upload' },
    { status: 500 }
  );
}

export async function PUT(request: NextRequest) {
  try {
    // Authentication temporarily disabled for testing
    // const session = await getServerSession(authOptions);
    // if (!session?.user) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    // Extract the key from pathname, removing /api/mock-upload/ prefix
    const pathParts = request.nextUrl.pathname.split('/');
    const keyParts = pathParts.slice(3); // Skip /api/mock-upload/ parts
    const key = keyParts.join('/');
    
    // Get content type and validate file type
    const contentType = request.headers.get('content-type') || '';
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.some(type => contentType.startsWith(type))) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPG, PNG, GIF and WebP images are allowed.' 
      }, { status: 400 });
    }
    
    // Get file content
    const buffer = await request.arrayBuffer();
    
    // Validate file size (5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (buffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File size exceeds 5MB limit.' 
      }, { status: 400 });
    }
    
    console.log(`Received file upload: ${key}`);
    console.log(`File size: ${buffer.byteLength} bytes`);

    // Construct the URL where the file would be accessible
    const imageUrl = `https://${process.env.NEXT_PUBLIC_AWS_ENDPOINT}/${process.env.NEXT_PUBLIC_AWS_BUCKET_NAME}/${key}`;

    return NextResponse.json({ 
      success: true, 
      message: 'File uploaded successfully',
      key,
      url: imageUrl
    });
  } catch (error) {
    return handleError(error);
  }
} 