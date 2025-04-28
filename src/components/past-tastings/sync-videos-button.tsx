'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface SyncVideosButtonProps {
  onSuccess?: () => void
  className?: string
}

/**
 * Button that triggers synchronization of video statuses with Mux
 * This fixes videos that are stuck in "processing" state but are actually ready
 */
export default function SyncVideosButton({ onSuccess, className = '' }: SyncVideosButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [results, setResults] = useState<any>(null)

  async function handleSyncVideos() {
    if (isSyncing) return
    
    setIsSyncing(true)
    setResults(null)
    
    const toastId = toast.loading('Syncing video statuses with Mux...')
    
    try {
      const response = await fetch('/api/videos/sync-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`Sync failed with status: ${response.status}`)
      }
      
      const data = await response.json()
      setResults(data)
      
      // Count updates
      const updatedCount = data.results?.filter((r: any) => r.status === 'updated')?.length || 0
      
      if (updatedCount > 0) {
        toast.success(`Fixed ${updatedCount} video${updatedCount === 1 ? '' : 's'}!`, { id: toastId })
        if (onSuccess) onSuccess()
      } else {
        toast.success('All videos are up to date', { id: toastId })
      }
    } catch (error) {
      console.error('Error syncing videos:', error)
      toast.error('Failed to sync videos with Mux', { id: toastId })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <button
      onClick={handleSyncVideos}
      disabled={isSyncing}
      className={`flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Sync videos with Mux to fix processing status"
    >
      <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
      <span>{isSyncing ? 'Syncing...' : 'Fix Processing Videos'}</span>
    </button>
  )
} 