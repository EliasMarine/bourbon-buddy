import { NextResponse, NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase-auth';
// Removed authOptions import - not needed with Supabase Auth;
import supabase, { createServerSupabaseClient } from '@/lib/supabase';

// Proper way to extract ID in Next.js App Router
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { id: streamId } = params;
    console.log('Interactions API called for stream:', streamId);
    
    // Validate the streamId
    if (!streamId) {
      console.error('No stream ID provided');
      return NextResponse.json(
        { error: 'Missing stream ID' },
        { status: 400 }
      );
    }
    
    const user = await getCurrentUser();
    console.log('Current user:', user?.email || 'Not logged in');

    // Get total likes count
    const { count: likesCount, error: countError } = await supabase
      .from('StreamLike')
      .select('*', { count: 'exact', head: true })
      .eq('streamId', streamId);
    
    if (countError) {
      console.error('Error getting likes count:', countError);
      return NextResponse.json(
        { error: 'Error getting likes count' },
        { status: 500 }
      );
    }
    
    console.log('Likes count for stream:', likesCount || 0);

    // If user is not logged in, return only public data
    if (!user?.email) {
      return NextResponse.json({
        likes: likesCount || 0,
        isLiked: false,
        isSubscribed: false,
      });
    }

    // Get user from database
    const { data: dbUser, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('email', user.email)
      .single();

    if (userError || !dbUser) {
      console.error('User not found in database:', user.email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get stream to check host
    const { data: stream, error: streamError } = await supabase
      .from('Stream')
      .select('hostId')
      .eq('id', streamId)
      .single();

    if (streamError || !stream) {
      console.error('Stream not found:', streamId);
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Check if user has liked the stream
    const { data: like, error: likeError } = await supabase
      .from('StreamLike')
      .select('*')
      .eq('streamId', streamId)
      .eq('userId', dbUser.id)
      .single();

    // Check if user is subscribed to the host
    const { data: subscription, error: subscriptionError } = await supabase
      .from('StreamSubscription')
      .select('*')
      .eq('hostId', stream.hostId)
      .eq('userId', dbUser.id)
      .single();
    
    const result = {
      likes: likesCount || 0,
      isLiked: !!like,
      isSubscribed: !!subscription,
    };
    
    console.log('Interaction result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Stream interactions GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 