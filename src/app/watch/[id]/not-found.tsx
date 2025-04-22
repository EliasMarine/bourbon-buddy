import Link from "next/link"

export default function VideoNotFound() {
  return (
    <div className="container mx-auto py-8">
      <div className="bg-red-50 p-6 rounded-lg border border-red-200 max-w-4xl mx-auto">
        <h1 className="text-xl font-medium text-red-800 mb-4">Video Not Found</h1>
        <p className="text-red-700 mb-4">
          The video you're looking for either doesn't exist or isn't available.
        </p>
        <Link
          href="/streams"
          className="px-4 py-2 bg-red-100 text-red-800 font-medium rounded hover:bg-red-200 transition-colors inline-block"
        >
          Return to Tastings
        </Link>
      </div>
    </div>
  )
} 