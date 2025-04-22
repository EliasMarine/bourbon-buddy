import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { MuxPlayer } from '@/components/ui/mux-player'
import { Skeleton } from '@/components/ui/skeleton'
import { prisma } from '@/lib/prisma'

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

interface VideoPageProps {
  params: {
    id: string
  }
}

async function getVideo(id: string): Promise<Video | null> {
  const video = await prisma.video.findUnique({
    where: { id }
  }) as Video | null
  
  if (!video || !video.muxPlaybackId) {
    return null
  }
  
  // Increment view count
  await prisma.video.update({
    where: { id },
    data: { views: { increment: 1 } }
  })
  
  return video
}

export default async function VideoPage({ params }: VideoPageProps) {
  // Ensure params.id is fully resolved before using it
  const videoId = await Promise.resolve(params.id);
  
  if (!videoId) {
    notFound()
  }
  
  const video = await getVideo(videoId);
  
  if (!video || !video.muxPlaybackId) {
    notFound()
  }
  
  // Format the date for display
  const formattedDate = new Date(video.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  // Show video
  return (
    <div className="container mx-auto py-8">
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
      </div>
    </div>
  )
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
  )
} 