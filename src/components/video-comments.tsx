'use client'

import { useState } from 'react'
import Link from 'next/link'

interface User {
  name: string | null
  image: string | null
}

interface Comment {
  id: string
  content: string
  userId: string
  videoId: string
  createdAt: Date
  user: User
}

interface VideoCommentsProps {
  videoId: string
  initialComments: Comment[]
}

// Helper to normalize API response to Comment type
function normalizeComment(raw: any): Comment {
  return {
    id: raw.id,
    content: raw.content,
    userId: raw.userId,
    videoId: raw.videoId,
    createdAt: raw.createdAt || raw.created_at ? new Date(raw.createdAt || raw.created_at) : new Date(),
    user: {
      name: raw.user?.name ?? null,
      image: raw.user?.image ?? null,
    },
  }
}

export default function VideoComments({ videoId, initialComments }: VideoCommentsProps) {
  // Normalize initial comments
  const [comments, setComments] = useState<Comment[]>(
    initialComments.map(normalizeComment)
  )
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showSignIn, setShowSignIn] = useState(false)

  // Handle comment submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setShowSignIn(false)
    if (!newComment.trim()) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment,
          videoId
        }),
      })

      if (response.status === 401) {
        setShowSignIn(true)
        setErrorMsg('You must be signed in to post a comment.')
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        console.error('Comment submission failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData: data
        });
        setErrorMsg(data.error || 'Failed to post comment. Please try again.')
        return
      }

      const commentRaw = await response.json()
      const comment = normalizeComment(commentRaw)
      setComments(prev => [comment, ...prev])
        setNewComment('')
    } catch (error) {
      setErrorMsg('Failed to post comment. Please try again.')
      console.error('Failed to post comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format the date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
          className="w-full min-h-24 resize-none p-4 bg-zinc-900/30 backdrop-blur-sm border border-zinc-700/50 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-amber-500/70 focus:border-transparent transition-all focus:outline-none"
          disabled={isSubmitting}
        />
        {errorMsg && (
          <div className="text-red-400 text-sm font-medium px-2 py-1 bg-red-900/30 rounded">
            {errorMsg}
          </div>
        )}
        {showSignIn && (
          <div className="text-amber-400 text-sm font-medium px-2 py-1 bg-amber-900/30 rounded mt-2">
            <span>You must be signed in to post a comment. </span>
            <Link href="/login" className="underline hover:text-amber-300">Sign in</Link>
          </div>
        )}
        <div className="flex justify-end">
          <button 
            type="submit"
            className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-1 disabled:opacity-50 bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 disabled:bg-amber-500/50 text-sm px-5 py-2.5 shadow-md shadow-amber-900/20"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                Posting...
              </>
            ) : (
              'Post Comment'
            )}
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <div className="text-center py-10 px-6 text-zinc-400 border-2 border-dashed border-zinc-700/40 rounded-lg bg-zinc-800/20 backdrop-blur-sm">
          <svg className="w-12 h-12 mx-auto mb-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <p className="font-medium text-zinc-300 mb-1">No comments yet</p>
          <p>Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <div key={comment.id} className="bg-zinc-800/30 backdrop-blur-sm p-4 rounded-lg border border-zinc-700/40 hover:border-zinc-600/40 transition-colors">
              <div className="flex items-center space-x-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-zinc-900/80 flex items-center justify-center text-amber-500 overflow-hidden shadow-sm">
                  {comment.user.image ? (
                    <img 
                      src={comment.user.image} 
                      alt={comment.user.name || 'User'} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-semibold text-sm">{comment.user.name?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">{comment.user.name || 'Anonymous'}</p>
                  <time className="text-xs text-zinc-500">{formatDate(comment.createdAt)}</time>
                </div>
              </div>
              <p className="text-zinc-300 whitespace-pre-wrap pl-12">{comment.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 