import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      name,
      username,
      location,
      occupation,
      education,
      bio,
    } = await request.json();

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || undefined,
        username: username || undefined,
        location: location || undefined,
        occupation: occupation || undefined,
        education: education || undefined,
        bio: bio || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        ...updatedUser,
        image: updatedUser.image,
        coverPhoto: updatedUser.coverPhoto,
      },
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 