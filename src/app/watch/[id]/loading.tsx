import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
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