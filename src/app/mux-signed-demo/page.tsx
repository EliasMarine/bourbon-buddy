import MuxSignedVideoUploader from '@/components/MuxSignedVideoUploader'

export const metadata = {
  title: 'MUX Signed Video Demo',
  description: 'Learn how to use MUX signed playback URLs for secure video delivery',
}

export default function MuxSignedDemoPage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">MUX Signed Video Demo</h1>
      
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <div className="prose mx-auto mb-8">
          <h2>Secure Video Playback with MUX</h2>
          <p>
            This demo shows how to create MUX assets with signed playback URLs for secure video delivery.
            Signed URLs require a JWT token to access the video, preventing unauthorized distribution.
          </p>
          <p>
            Key features of this demo:
          </p>
          <ul>
            <li>Creating MUX assets with the "signed" playback policy</li>
            <li>Generating JWT tokens for secure video access</li>
            <li>Creating signed playback URLs with the tokens</li>
            <li>Displaying videos with secure signed URLs</li>
          </ul>
        </div>
        
        <div className="border-t pt-8">
          <MuxSignedVideoUploader />
        </div>
      </div>
    </div>
  )
} 