'use client'

import { useEffect, useState } from 'react'
import { useSupabase, useSessionContext } from '@/components/providers/SupabaseProvider'

// Simple UI components since we don't have access to the specific UI library
function Button({ 
  children, 
  onClick, 
  disabled = false, 
  variant = 'default' 
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  disabled?: boolean; 
  variant?: 'default' | 'outline'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-md ${
        variant === 'outline'
          ? 'border border-gray-300 hover:bg-gray-100'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="border rounded-lg shadow-sm overflow-hidden">{children}</div>
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="p-4 border-b">{children}</div>
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold">{children}</h2>
}

function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500">{children}</p>
}

function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="p-4">{children}</div>
}

function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 border-t ${className}`}>{children}</div>
}

function Badge({ 
  children, 
  variant = 'default' 
}: { 
  children: React.ReactNode; 
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}) {
  const getColorClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'destructive':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getColorClasses()}`}>
      {children}
    </span>
  )
}

interface SessionInfo {
  sessionAuth: {
    authenticated: boolean
    email: string | null
    name: string | null
  }
  supabase: {
    authenticated: boolean
    session: {
      expires_at: number
      user_id: string
    } | null
    user: {
      id: string
      email: string
      createdAt: string
    } | null
  }
  status: {
    synced: boolean
    timestamp: string
  }
}

export default function SessionDebugger() {
  // Get session info from context
  const { session, status } = useSessionContext()
  const supabase = useSupabase()
  
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSessionStatus = async () => {
    // Skip if we're not in a browser environment
    if (typeof window === 'undefined') return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/session-status')
      if (!response.ok) {
        setError(`Error fetching session status: ${response.status}`)
        return
      }
      
      const data = await response.json()
      setSessionInfo(data)
    } catch (err) {
      setError(`Failed to fetch session info: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Only run this effect in browser environments
    if (typeof window !== 'undefined') {
      fetchSessionStatus()
    }
  }, [session])

  // Simplified sync function that doesn't try to use auth directly
  const handleManualSync = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/supabase-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        setError(`Error syncing sessions: ${response.status}`)
        return
      }
      
      // Refresh the page to apply the new session
      window.location.reload()
    } catch (err) {
      setError(`Failed to sync sessions: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Status</CardTitle>
        <CardDescription>Debug information about authentication</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="py-6 text-center">Loading session info...</div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Session Auth</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={sessionInfo?.sessionAuth.authenticated ? "success" : "destructive"}>
                  {sessionInfo?.sessionAuth.authenticated ? "Authenticated" : "Not authenticated"}
                </Badge>
                {sessionInfo?.sessionAuth.email && (
                  <span className="text-sm text-gray-500">{sessionInfo.sessionAuth.email}</span>
                )}
              </div>
              
              {/* Display session token information */}
              <div className="mt-3 text-sm">
                <p>
                  <span className="font-medium">Session Status: </span>
                  <Badge variant={session ? "success" : "destructive"}>
                    {session ? "Available" : "Missing"}
                  </Badge>
                </p>
                
                {session && (
                  <div className="mt-1 text-xs text-gray-500 overflow-hidden text-ellipsis">
                    User ID: {session.user?.id?.substring(0, 15)}...
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Supabase</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={sessionInfo?.supabase.authenticated ? "success" : "destructive"}>
                  {sessionInfo?.supabase.authenticated ? "Authenticated" : "Not authenticated"}
                </Badge>
                {sessionInfo?.supabase.user?.email && (
                  <span className="text-sm text-gray-500">{sessionInfo.supabase.user.email}</span>
                )}
              </div>
              
              {sessionInfo?.supabase.session && (
                <div className="mt-2 text-xs text-gray-500">
                  Expires: {new Date(sessionInfo.supabase.session.expires_at * 1000).toLocaleString()}
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Sync Status</h3>
              <Badge variant={sessionInfo?.status.synced ? "success" : "warning"}>
                {sessionInfo?.status.synced ? "In Sync" : "Out of Sync"}
              </Badge>
              {sessionInfo?.status.timestamp && (
                <div className="mt-1 text-xs text-gray-500">
                  Last checked: {new Date(sessionInfo.status.timestamp).toLocaleString()}
                </div>
              )}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
              <p>
                If "Out of Sync" or missing Supabase session, click the "Sync Sessions" button below.
                If that fails, try logging out and back in to ensure both sessions are properly synced.
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={fetchSessionStatus} variant="outline" disabled={isLoading}>
          Refresh Status
        </Button>
        <Button onClick={handleManualSync} disabled={isLoading}>
          Sync Sessions
        </Button>
      </CardFooter>
    </Card>
  )
} 