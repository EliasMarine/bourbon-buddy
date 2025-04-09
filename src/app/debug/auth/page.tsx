import SessionDebugger from '@/components/debug/SessionDebugger'

export default function AuthDebugPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Session Status</h2>
          <SessionDebugger />
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Auth Troubleshooting</h2>
          
          <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
            <p className="font-medium">Common Issues & Solutions</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-lg mb-2">Login Problems</h3>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li>If you can't log in after logging out, try clearing <strong>all browser cookies</strong> for this domain.</li>
                <li>Click the "Sync Sessions" button above if you see "Out of Sync" status.</li>
                <li>If the sync button doesn't work, try the manual cleanup process below.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-lg mb-2">Signup Issues</h3>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li>If signup fails with "User already exists", but you can't log in, try the password reset flow.</li>
                <li>Check your email for verification messages if you've signed up recently.</li>
                <li>If you're getting CSRF errors, ensure your browser accepts cookies from this domain.</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-lg mb-2">Manual Cleanup Process</h3>
              <p className="text-gray-700 mb-2">If you're experiencing persistent issues, try this manual cleanup:</p>
              <ol className="list-decimal ml-6 space-y-2 text-gray-700">
                <li>Open your browser's developer tools (F12 or right-click → Inspect)</li>
                <li>Go to the "Application" tab → Storage → Cookies</li>
                <li>Delete all cookies for this domain</li>
                <li>Go to "Local Storage" and "Session Storage" and clear those too</li>
                <li>Refresh the page and try logging in again</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-medium text-lg mb-2">Technical Details</h3>
              <p className="text-gray-700 mb-2">For developers - this site uses:</p>
              <ul className="list-disc ml-6 space-y-1 text-gray-700">
                <li>NextAuth for primary authentication</li>
                <li>Supabase Auth for JWT tokens and session management</li>
                <li>The two systems are synchronized automatically when you log in</li>
                <li>Issues often occur when the synchronization fails</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 