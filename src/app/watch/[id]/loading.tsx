import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="bg-zinc-950 text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="w-full aspect-video bg-zinc-900 rounded-xl animate-pulse mb-6 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-16 h-16 text-amber-600/30 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
        
        <div className="h-8 bg-zinc-900 rounded-md w-3/4 animate-pulse mb-4"></div>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-full animate-pulse"></div>
            <div className="h-4 bg-zinc-900 rounded w-32 animate-pulse"></div>
          </div>
          <div className="h-6 bg-zinc-900 rounded w-24 animate-pulse"></div>
        </div>
        
        <div className="space-y-3 mb-8">
          <div className="h-4 bg-zinc-900 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-zinc-900 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-zinc-900 rounded w-2/3 animate-pulse"></div>
        </div>
        
        <div className="h-6 bg-zinc-900 rounded w-40 animate-pulse mb-4"></div>
        <div className="space-y-4">
          <div className="h-24 bg-zinc-900 rounded w-full animate-pulse"></div>
          <div className="h-24 bg-zinc-900 rounded w-full animate-pulse"></div>
          <div className="h-24 bg-zinc-900 rounded w-full animate-pulse"></div>
        </div>
      </div>
    </div>
  )
} 