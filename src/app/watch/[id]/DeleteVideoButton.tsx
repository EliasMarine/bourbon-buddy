"use client"

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteVideoAction } from './delete-video-action'

interface DeleteVideoButtonProps {
  id: string
}

/**
 * Button component for deleting videos with confirmation
 */
export default function DeleteVideoButton({ id }: DeleteVideoButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return
    }
    
    setIsDeleting(true)
    
    try {
      // Create FormData as expected by the action
      const formData = new FormData()
      formData.append('id', id)
      
      await deleteVideoAction(formData)
      
      // Use startTransition to refresh UI for Next.js
      startTransition(() => {
        router.push('/past-tastings')
        router.refresh()
      })
    } catch (error) {
      console.error('Error deleting video:', error)
      setIsDeleting(false)
      alert('Failed to delete the video. Please try again.')
    }
  }
  
  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting || isPending}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/80 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:pointer-events-none border border-zinc-700/40 focus:outline-none focus:ring-2 focus:ring-amber-500/70 focus:ring-offset-2 focus:ring-offset-zinc-900 shadow-sm hover:shadow backdrop-blur-sm"
    >
      {isDeleting || isPending ? (
        <>
          <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Deleting...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Video
        </>
      )}
    </button>
  )
} 