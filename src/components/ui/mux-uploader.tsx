'use client'

import { useState, useRef, ChangeEvent, FormEvent } from 'react'
import { createVideoUpload, markUploadComplete } from '@/app/api/mux/upload/action'
import { Video, Upload, AlertCircle } from 'lucide-react'

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
    <div className={`${className || ''}`}>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-200 mb-1">
            Title*
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm 
                      focus:border-amber-500 focus:ring-amber-500 placeholder:text-gray-400 p-3"
            placeholder="What are you sharing today?"
            disabled={isUploading}
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-200 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm 
                      focus:border-amber-500 focus:ring-amber-500 placeholder:text-gray-400 p-3"
            placeholder="Tell others about your bourbon experience..."
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
            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${file ? 'border-amber-500/50' : 'border-gray-600'} 
                       border-dashed rounded-lg cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-amber-500 hover:bg-gray-800/50'}`}
          >
            <div className="space-y-2 text-center">
              {file ? (
                <Video className="mx-auto h-10 w-10 text-amber-500" />
              ) : (
                <Upload className="mx-auto h-10 w-10 text-gray-400" />
              )}
              
              <div className="flex flex-col text-sm">
                <span className="relative font-medium text-amber-500">
                  {file ? file.name : 'Select a video file'}
                </span>
                {file && (
                  <span className="text-xs text-gray-400 mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {allowedFileTypes.map(type => type.split('/')[1]).join(', ')} up to {maxSizeMB}MB
              </p>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm p-2 bg-red-900/20 border border-red-900/30 rounded-md">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        
        {isUploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-amber-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Uploading: {uploadProgress}%</p>
          </div>
        )}
        
        <div>
          <button
            type="submit"
            disabled={isUploading || !file}
            className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2
              ${isUploading || !file 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors'}`}
          >
            <Video size={18} />
            {isUploading ? 'Uploading...' : file ? 'Upload Video' : 'Select a video first'}
          </button>
        </div>
      </form>
    </div>
  )
} 