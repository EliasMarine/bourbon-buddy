'use client'

import { useState } from 'react'

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

export default function VideoComments({ videoId, initialComments }: VideoCommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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

      if (response.ok) {
        const comment = await response.json()
        setComments(prev => [comment, ...prev])
        setNewComment('')
      }
    } catch (error) {
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
          className="w-full min-h-24 resize-none p-3 border rounded-md"
          disabled={isSubmitting}
        />
        <div className="flex justify-end">
          <button 
            type="submit"
            className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 disabled:opacity-50 bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 disabled:bg-amber-500 text-sm px-4 py-2"
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
        <div className="text-center py-8 text-gray-500">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white p-4 rounded-md border">
              <div className="flex items-center space-x-3 mb-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  {comment.user.image ? (
                    <img 
                      src={comment.user.image} 
                      alt={comment.user.name || 'User'} 
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <span>{comment.user.name?.charAt(0) || 'U'}</span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{comment.user.name || 'Anonymous'}</p>
                  <time className="text-xs text-gray-500">{formatDate(comment.createdAt)}</time>
                </div>
              </div>
              <p className="whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 