import { ReloadButton } from "./reload-button";

export default function DebugTestPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Debug Test Page</h1>
      <p className="mb-4">
        If you can see this text, basic page rendering is working correctly.
      </p>
      <div className="p-4 bg-amber-800/20 rounded-lg border border-amber-600/30 mb-6">
        <h2 className="text-xl font-semibold mb-2">Rendering Test</h2>
        <p>This page is a minimal test to check if page rendering works.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-800 rounded-lg">
          <h3 className="font-medium mb-2">Static Content Check</h3>
          <p>This content is statically rendered.</p>
        </div>
        <div className="p-4 bg-gray-800 rounded-lg">
          <h3 className="font-medium mb-2">Styling Check</h3>
          <p>This checks if Tailwind styles are applied correctly.</p>
        </div>
      </div>
      
      <div className="flex gap-4">
        <a 
          href="/"
          className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
        >
          Go to Homepage
        </a>
        <ReloadButton />
      </div>
    </div>
  );
} 