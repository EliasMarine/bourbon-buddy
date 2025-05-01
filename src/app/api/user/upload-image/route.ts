import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = await createServerComponentClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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

    // Update user in database based on type
    const updateData: Record<string, any> = type === 'profile' 
      ? { image: imageUrl } 
      : { coverPhoto: imageUrl };
    
    // Add timestamp
    updateData.updatedAt = new Date().toISOString();

    // Update user in database
    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update(updateData)
      .eq('id', user.id)
      .select('id, name, email, username, image, coverPhoto')
      .single();

    if (updateError) {
      console.error('Error updating user image:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user profile' },
        { status: 500 }
      );
    }

    // Return success with updated user
    return NextResponse.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 