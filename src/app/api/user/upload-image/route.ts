import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { imageUrl, type } = await request.json();

    if (!imageUrl || !type || !['profile', 'cover'].includes(type)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Add a cache-busting parameter to the image URL
    let finalImageUrl = imageUrl;
    if (!imageUrl.includes('?')) {
      finalImageUrl = `${imageUrl}?_cb=${Date.now()}`;
    } else if (!imageUrl.includes('_cb=')) {
      finalImageUrl = `${imageUrl}&_cb=${Date.now()}`;
    }

    // Update the user record with the new image URL
    const updateData = type === 'profile' 
      ? { image: finalImageUrl }
      : { coverPhoto: finalImageUrl };

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        coverPhoto: true,
        username: true,
        location: true,
        occupation: true,
        education: true,
        bio: true,
        publicProfile: true,
      }
    });

    // Return response with cache control headers
    const response = NextResponse.json({ 
      success: true, 
      user: updatedUser
    });
    
    // Add cache control headers to prevent browser caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error updating user image:', error);
    return NextResponse.json(
      { error: 'Failed to update image' },
      { status: 500 }
    );
  }
} 