import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { MuxPlayer } from '@/components/ui/mux-player'
import { Skeleton } from '@/components/ui/skeleton'
import { safePrismaQuery, prisma } from '@/lib/prisma-fix'
import VideoComments from '@/components/video-comments'
import { ErrorBoundary } from 'react-error-boundary'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteVideoAction } from './delete-video-action'

// Revalidate the page every 60 seconds
export const revalidate = 60

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

// Separate the database access to its own function
async function getVideo(id: string): Promise<Video | null> {
  try {
    // Use safePrismaQuery to handle prepared statement errors
    const video = await safePrismaQuery(() => 
      prisma.video.findUnique({
        where: { id }
      }) as Promise<Video | null>
    )
    
    if (!video || !video.muxPlaybackId) {
      return null
    }
    
    // Use safePrismaQuery for the update as well
    await safePrismaQuery(() =>
      prisma.video.update({
        where: { id },
        data: { views: { increment: 1 } }
      })
    )
    
    return video
  } catch (error) {
    console.error(`Error fetching video with ID ${id}:`, error)
    return null
  }
}

// Get video comments
async function getVideoComments(videoId: string): Promise<Comment[]> {
  try {
    // Direct Prisma query for production-ready implementation
    return await safePrismaQuery(() => 
      prisma.comment.findMany({
        where: { videoId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              image: true
            }
          }
        }
      }) as Promise<Comment[]>
    );
  } catch (error) {
    console.error(`Error fetching comments for video ${videoId}:`, error);
    return [];
  }
}

function DeleteVideoButton({ id }: { id: string }) {
  const [isDeleting, startDelete] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this video? This cannot be undone.')) return
    startDelete(async () => {
      const formData = new FormData()
      formData.append('id', id)
      const result = await deleteVideoAction(formData)
      if (result?.success) {
        router.push('/streams')
      } else {
        setError(result?.error || 'Failed to delete video.')
      }
    })
  }

  return (
    <div className="flex justify-end mb-4">
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
      >
        {isDeleting ? 'Deleting...' : 'Delete Video'}
      </button>
      {error && <div className="text-red-500 ml-4">{error}</div>}
    </div>
  )
}

// Fixed VideoPage component to properly handle async params
export default async function VideoPage(props: { 
  params: Promise<{ id: string }> 
}) {
  // Await the entire params object first before accessing properties
  const params = await props.params;
  const id = params.id;
  
  console.log('Starting VideoPage component');
  console.log(`Resolved ID: ${id}`);
  
  if (!id) {
    console.error('[watch] Missing video ID in page parameters');
    return notFound();
  }
  
  // Fetch video data
  const video = await getVideo(id);
  
  if (!video || !video.muxPlaybackId) {
    console.warn(`[watch/${id}] Video not found or missing playbackId`);
    return notFound();
  }

  // Fetch comments
  const comments = await getVideoComments(id);
  
  // Format the date for display
  const formattedDate = new Date(video.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="container mx-auto py-8">
      <DeleteVideoButton id={id} />
      <h1 className="text-2xl font-bold mb-4">{video.title}</h1>
      <div className="w-full max-w-4xl mx-auto">
        <Suspense fallback={<div className="w-full aspect-video bg-gray-200 animate-pulse rounded-md"></div>}>
          <MuxPlayer 
            playbackId={video.muxPlaybackId}
            accentColor="#3b82f6"
            metadataVideoTitle={video.title}
          />
        </Suspense>
      </div>
      <div className="mt-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <time className="text-gray-500">{formattedDate}</time>
          <span className="text-gray-500">{video.views || 0} views</span>
        </div>
        {video.description && (
          <>
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{video.description}</p>
          </>
        )}
        {/* Comments Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Comments</h2>
          <ErrorBoundary
            fallback={
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
                <p className="text-amber-700">Comments could not be loaded.</p>
                <p className="text-amber-600 text-sm">Sign in to view and post comments.</p>
                {process.env.NODE_ENV !== 'production' && (
                  <p className="text-red-600 text-xs mt-2">Error loading comments.</p>
                )}
              </div>
            }
          >
            <VideoComments videoId={id} initialComments={comments} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

// Add a loading state component
export function Loading() {
  return (
    <div className="container mx-auto py-8">
      <Skeleton className="w-3/4 h-12 mb-4" />
      <div className="w-full max-w-4xl mx-auto">
        <Skeleton className="w-full aspect-video" />
      </div>
      <div className="mt-6 max-w-4xl mx-auto">
        <Skeleton className="w-full h-48" />
      </div>
    </div>
  );
} 