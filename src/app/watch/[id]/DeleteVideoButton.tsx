'use client'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteVideoAction } from './delete-video-action'

interface DeleteVideoButtonProps {
  id: string
}

export default function DeleteVideoButton({ id }: DeleteVideoButtonProps) {
  const [isDeleting, startDelete] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this video? This cannot be undone.')) return
    startDelete(async () => {
      const formData = new FormData()
      formData.append('id', id)
      const result = await deleteVideoAction(formData)
      if (result?.success) {
        router.push('/streams')
      } else {
        setError(result?.error || 'Failed to delete video.')
      }
    })
  }

  return (
    <div className="flex justify-end mb-4">
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
      >
        {isDeleting ? 'Deleting...' : 'Delete Video'}
      </button>
      {error && <div className="text-red-500 ml-4">{error}</div>}
    </div>
  )
} 