import { notFound } from 'next/navigation'
import { supabaseAdmin, safeSupabaseQuery } from '@/lib/supabase-server'
import Mux from '@mux/mux-node'
import VideoPlaybackPage from './video-playback-page'

// Set a static revalidate value for this route
export const revalidate = 10 // Revalidate every 10 seconds

// Define the Video interface to match the database schema
interface Video {
  id: string
  title: string
  description: string | null
  status: string
  muxUploadId: string | null
  muxAssetId: string | null
  muxPlaybackId: string | null
  duration: number | null
  aspectRatio: string | null
  thumbnailTime: number | null
  userId: string | null
  createdAt: Date
  updatedAt: Date
  publiclyListed: boolean
  views: number
  user?: {
    name: string | null
    image: string | null
    username: string | null
  }
}

// Define the Comment interface
interface Comment {
  id: string
  content: string
  userId: string
  videoId: string
  createdAt: Date
  user: {
    name: string | null
    image: string | null
  }
}

/**
 * Checks if a video playback ID is a placeholder
 */
function isPlaceholderId(playbackId: string | null): boolean {
  return !!playbackId && playbackId.startsWith('placeholder-')
}

// Separate the database access to its own function
async function getVideo(id: string): Promise<Video | null> {
  try {
    // Query video with Supabase - use Video with capital V, no quotes
    const { data: video, error } = await safeSupabaseQuery(async () => {
      const { data, error } = await supabaseAdmin
        .from('Video') 
        .select('*, user:userId(name, image, username)')
        .eq('id', id)
        .single();
      
      return { data, error };
    });
    
    if (error || !video) {
      console.error(`Error finding video: ${error?.message}`);
      return null;
    }
    
    return video;
  } catch (error) {
    console.error(`Error fetching video with ID ${id}:`, error);
    return null;
  }
}

// Get additional videos from the same user
async function getUserVideos(userId: string, currentVideoId: string, limit = 8): Promise<Video[]> {
  if (!userId) return [];
  
  try {
    const { data, error } = await safeSupabaseQuery(async () => {
      return supabaseAdmin
        .from('Video')
        .select('*, user:userId(name, image, username)')
        .eq('userId', userId)
        .eq('status', 'ready')
        .neq('id', currentVideoId) // Exclude current video
        .order('createdAt', { ascending: false })
        .limit(limit);
    });
    
    if (error) {
      console.error(`Error fetching user videos: ${error.message}`);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching user videos: ${error}`);
    return [];
  }
}

// Get video comments
async function getVideoComments(videoId: string): Promise<Comment[]> {
  try {
    // 1. Fetch comments for the video
    const { data: commentsData, error: commentsError } = await safeSupabaseQuery(async () => {
      return supabaseAdmin
        .from('Comment')
        .select('id, content, userId, videoId, createdAt')
        .eq('videoId', videoId)
        .order('createdAt', { ascending: false });
    });

    if (commentsError) {
      console.error(`Error fetching comments data: ${commentsError.message}`);
      return []; 
    }

    if (!commentsData || commentsData.length === 0) {
      return [];
    }

    // 2. Get unique user IDs from comments
    const userIds = Array.from(new Set(commentsData.map(comment => comment.userId).filter(id => id)));
    
    if (userIds.length === 0) {
      return commentsData.map(c => ({ ...c, user: { name: 'Unknown User', image: null } }));
    }

    // 3. Fetch user data for those IDs
    const { data: usersData, error: usersError } = await safeSupabaseQuery(async () => {
      return supabaseAdmin
        .from('User')
        .select('id, name, image')
        .in('id', userIds);
    });

    if (usersError) {
      console.error(`Error fetching user data: ${usersError.message}`);
      return commentsData.map(c => ({ ...c, user: { name: 'User Error', image: null } }));
    }
    
    if (!usersData) {
      return commentsData.map(c => ({ ...c, user: { name: 'User Not Found', image: null } }));
    }

    // 4. Map users to a lookup object
    const userMap = usersData.reduce((acc, user) => {
      acc[user.id] = { name: user.name, image: user.image };
      return acc;
    }, {} as Record<string, { name: string | null; image: string | null }>);

    // 5. Combine comments with user data
    const combinedComments = commentsData.map(comment => ({
      ...comment,
      user: userMap[comment.userId] || { name: 'Unknown User', image: null },
      // Ensure date types are correct if necessary
      createdAt: new Date(comment.createdAt),
    }));
    
    return combinedComments;
  } catch (error) {
    console.error(`Unhandled error in getVideoComments for video ${videoId}:`, error);
    return []; // Return empty on unexpected errors
  }
}

// Sync video status with Mux
async function syncVideoStatus(videoId: string) {
  if (process.env.SKIP_VIDEO_SYNC === 'true') return;
  
  try {
    // Check the current video info
    const { data: video, error } = await supabaseAdmin
      .from('Video')
      .select('*')
      .eq('id', videoId)
      .single();
      
    if (error || !video) {
      console.log(`No video found with ID ${videoId} to sync`);
      return;
    }
    
    const assetId = video.muxAssetId;
    if (!assetId) {
      console.log(`Video ${videoId} has no Mux asset ID, skipping sync`);
      return;
    }
    
    try {
      // Check asset status with Mux API directly
      const muxClient = new Mux({
        tokenId: process.env.MUX_TOKEN_ID || '',
        tokenSecret: process.env.MUX_TOKEN_SECRET || '',
      });
      
      const asset = await muxClient.video.assets.retrieve(assetId);
      const assetStatus = asset.status;
      let needsUpdate = false;
      
      // Prepare update object
      const updateData: Record<string, any> = {};
      
      // Update status if it doesn't match
      if (video.status !== assetStatus) {
        updateData.status = assetStatus;
        needsUpdate = true;
      }
      
      // Handle playback ID - always prefer using real Mux playback IDs
      if (assetStatus === 'ready') {
        const hasPlaceholder = video.muxPlaybackId?.startsWith('placeholder-') || false;
        
        // Update playback ID if it's a placeholder or missing
        if (hasPlaceholder || !video.muxPlaybackId) {
          let actualPlaybackId;
          
          // Use existing playback ID from the asset if available
          if (asset.playback_ids && asset.playback_ids.length > 0) {
            actualPlaybackId = asset.playback_ids[0].id;
          } else {
            // Create a new playback ID if none exists
            const playbackResponse = await muxClient.video.assets.createPlaybackId(assetId, {
              policy: 'public'
            });
            actualPlaybackId = playbackResponse.id;
          }
          
          updateData.muxPlaybackId = actualPlaybackId;
          needsUpdate = true;
        }
        
        // Always update video metadata if the asset is ready
        updateData.duration = asset.duration || video.duration;
        updateData.aspectRatio = asset.aspect_ratio || video.aspectRatio;
      }
      
      // Only update if needed
      if (needsUpdate) {
        const { error: updateError } = await supabaseAdmin
          .from('Video')
          .update(updateData)
          .eq('id', videoId);

        if (updateError) {
          throw updateError;
        }
      }
    } catch (muxError) {
      console.error(`Error checking Mux status for video ${videoId}:`, muxError);
    }
  } catch (error) {
    console.error(`Error syncing video status for ${videoId}:`, error);
  }
}

// Video page component
export default async function VideoPage({ params }: { params: { id: string } }) {
  const id = params.id;
  
  if (!id) {
    return notFound();
  }
  
  // First, try to update the video status
  await syncVideoStatus(id);
  
  // Fetch video data
  const video = await getVideo(id);
  
  // If video is missing, show not found
  if (!video) {
    return notFound();
  }
  
  // If video is not ready, has a placeholder ID, or missing playbackId, show processing state
  const hasPlaceholder = isPlaceholderId(video.muxPlaybackId);
  if (video.status !== 'ready' || !video.muxPlaybackId || hasPlaceholder) {
    // Show a processing state if the video is not ready
    return (
      <div className="container mx-auto py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-24 h-24 rounded-full bg-blue-900/20 flex items-center justify-center mb-6 animate-pulse">
          <svg className="w-12 h-12 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-blue-200 mb-2">Processing Video...</h2>
        <p className="text-blue-100 text-center max-w-md mb-4">
          {hasPlaceholder ? 
            "This video has metadata but no playable content yet. The real video content may still need to be uploaded or processed." : 
            "This video is still being processed. Please check back soon!"}
        </p>
        <a href="/past-tastings" className="mt-4 px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors">Go Back to Past Tastings</a>
      </div>
    );
  }
  
  // Increment view count (fire and forget)
  supabaseAdmin
    .from('Video')
    .update({ views: (video.views || 0) + 1 })
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.error(`Error incrementing view count: ${error.message}`);
    });

  // Fetch comments
  const comments = await getVideoComments(id);
  
  // Fetch related videos from the same user
  const relatedVideos = video.userId ? await getUserVideos(video.userId, id, 8) : [];
  
  // Format the date for display
  const formattedDate = new Date(video.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Use the client component wrapper
  return <VideoPlaybackPage 
    video={video} 
    comments={comments} 
    formattedDate={formattedDate} 
    relatedVideos={relatedVideos}
  />;
} 