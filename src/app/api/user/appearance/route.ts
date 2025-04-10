import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
// Removed authOptions import - not needed with Supabase Auth;
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const data = await request.json();
    const { publicProfile } = data;

    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        publicProfile,
      },
    });

    return NextResponse.json({
      message: 'Appearance settings updated successfully',
      user: {
        ...updatedUser,
        password: undefined,
        resetToken: undefined,
        resetTokenExpiry: undefined,
      },
    });
  } catch (error) {
    console.error('Error updating appearance settings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 