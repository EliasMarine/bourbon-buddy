'use client'

import { useState, useRef, ChangeEvent, FormEvent } from 'react'
import { createVideoUpload, markUploadComplete } from '@/app/api/mux/upload/action'

interface MuxUploaderProps {
  onUploadComplete?: (uploadId: string) => void
  onUploadError?: (error: string) => void
  maxSizeMB?: number
  allowedFileTypes?: string[]
  className?: string
  userId?: string
}

export function MuxUploader({
  onUploadComplete,
  onUploadError,
  maxSizeMB = 500,
  allowedFileTypes = ['video/mp4', 'video/quicktime', 'video/mov'],
  className,
  userId,
}: MuxUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    
    if (!selectedFile) {
      setFile(null)
      return
    }
    
    // Check file type
    if (!allowedFileTypes.includes(selectedFile.type)) {
      setError(`Invalid file type. Allowed types: ${allowedFileTypes.join(', ')}`)
      setFile(null)
      return
    }
    
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (selectedFile.size > maxSizeBytes) {
      setError(`File too large. Maximum size: ${maxSizeMB}MB`)
      setFile(null)
      return
    }
    
    setFile(selectedFile)
    setError('')
    
    // Auto-populate title from filename if empty
    if (!title) {
      // Remove extension and replace dashes/underscores with spaces
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "")
      const cleanName = nameWithoutExt.replace(/[_-]/g, " ")
      setTitle(cleanName)
    }
  }
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      setError('Please select a file')
      return
    }
    
    try {
      setIsUploading(true)
      setError('')
      
      // Create a FormData object for the server action
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      if (userId) formData.append('userId', userId)
      
      // Create the upload URL
      const response = await createVideoUpload(formData)
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create upload')
      }
      
      // Upload the file directly to MUX
      await uploadFileToMux(file, response.data.uploadUrl)
      
      // Mark the upload as complete
      await markUploadComplete(response.data.uploadId)
      
      // Call the completion callback
      if (onUploadComplete) {
        onUploadComplete(response.data.uploadId)
      }
      
      // Reset the form
      setFile(null)
      setTitle('')
      setDescription('')
      setUploadProgress(0)
      if (formRef.current) formRef.current.reset()
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      if (onUploadError) onUploadError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }
  
  // Upload file directly to MUX with progress tracking
  const uploadFileToMux = (file: File, uploadUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      })
      
      // Handle completion or error
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      })
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'))
      })
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted'))
      })
      
      // Open connection and send the file
      xhr.open('PUT', uploadUrl, true)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  }
  
  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }
  
  return (
    <div className={`p-4 border rounded-lg ${className || ''}`}>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={isUploading}
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={isUploading}
          />
        </div>
        
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedFileTypes.join(',')}
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          
          <div 
            onClick={!isUploading ? triggerFileInput : undefined}
            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
          >
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <span className="relative font-medium text-blue-600 hover:text-blue-500">
                  {file ? file.name : 'Select a video file'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {allowedFileTypes.join(', ')} up to {maxSizeMB}MB
              </p>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="text-red-500 text-sm mt-2">{error}</div>
        )}
        
        {isUploading && (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
            <p className="text-xs text-gray-500 mt-1">Uploading: {uploadProgress}%</p>
          </div>
        )}
        
        <div>
          <button
            type="submit"
            disabled={isUploading || !file}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 
              ${isUploading || !file ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
          >
            {isUploading ? 'Uploading...' : 'Upload Video'}
          </button>
        </div>
      </form>
    </div>
  )
} 