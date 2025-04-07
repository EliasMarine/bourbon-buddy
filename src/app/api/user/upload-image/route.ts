import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get data from request
    const data = await request.json();
    const { imageUrl, type } = data;

    // Validate parameters
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image URL provided' },
        { status: 400 }
      );
    }

    if (type !== 'profile' && type !== 'cover') {
      return NextResponse.json(
        { error: 'Invalid image type. Must be "profile" or "cover"' },
        { status: 400 }
      );
    }

    // Update user in database
    const updateData = type === 'profile' 
      ? { image: imageUrl } 
      : { coverPhoto: imageUrl };

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        coverPhoto: user.coverPhoto
      }
    });
  } catch (error) {
    console.error('Error updating user image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 