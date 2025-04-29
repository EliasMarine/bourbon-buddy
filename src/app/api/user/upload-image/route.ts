import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
// Removed authOptions import - not needed with Supabase Auth;
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  // Initialize Supabase client
  const supabase = await createClient();

  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
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

    // Find user in database by email
    const { data: dbUser, error: dbUserError } = await supabase
  .from('User')
  .select('*')
  .eq('email', user.email)
  .single();

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: updateData,
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
        coverPhoto: updatedUser.coverPhoto
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