import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/auth';

export async function GET(request: Request) {
  const supabase = await createServerComponentClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Here you would typically fetch user data from your database
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      image: user.user_metadata?.avatar_url
    },
    // Add any additional user data here
  });
} 