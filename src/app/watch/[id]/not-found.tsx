import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="bg-zinc-950 text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-amber-900/20 flex items-center justify-center">
          <svg 
            className="w-12 h-12 text-amber-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" 
            />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">Video Not Found</h1>
        
        <p className="text-zinc-300 mb-8">
          Sorry, the video you're looking for doesn't exist or has been removed.
        </p>
        
        <Link 
          href="/past-tastings" 
          className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
        >
          Browse Past Tastings
        </Link>
      </div>
    </div>
  )
} 