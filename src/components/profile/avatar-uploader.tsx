"use client"

import React, { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

import Button from "@/components/ui/Button"
import { Input } from "@/components/ui/input" // Might not be needed directly, but good practice
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

// Placeholder for the server actions we created
import { createAvatarUploadUrl, updateAvatarReference } from '@/lib/actions/profile.actions'

interface AvatarUploaderProps {
  currentImageUrl: string | null | undefined;
  userId: string; // Needed for potentially displaying current image or other logic
  onUploadComplete: (newPath: string) => void; // Callback after successful upload + DB update
}

export function AvatarUploader({ currentImageUrl, userId, onUploadComplete }: AvatarUploaderProps) {
  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const [aspect, setAspect] = useState<number | undefined>(1 / 1) // Default to square aspect ratio
  const [isUploading, setIsUploading] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // --- Dropzone Callback ---
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const reader = new FileReader()
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''))
      reader.readAsDataURL(acceptedFiles[0])
      // Reset crop state when a new image is loaded
      setCrop(undefined)
      setCompletedCrop(undefined)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] }, // Accept all image types
    maxFiles: 1,
    // Add size limits, etc. if needed
  })

  // --- ReactCrop Callbacks ---
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    if (aspect) {
      setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height), width, height))
    }
  }

  // --- Cropping and Upload Logic ---
  async function handleUploadCroppedImage() {
    const image = imgRef.current
    const canvas = document.createElement('canvas')
    if (!image || !completedCrop || !canvas) {
      toast.error("Cropping failed. Please try again.")
      return
    }

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = Math.floor(completedCrop.width * scaleX)
    canvas.height = Math.floor(completedCrop.height * scaleY)

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      toast.error("Failed to get canvas context.")
      return
    }

    const cropX = completedCrop.x * scaleX
    const cropY = completedCrop.y * scaleY

    ctx.drawImage(
      image,
      cropX,
      cropY,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    )

    setIsUploading(true)
    toast.info("Processing and uploading avatar...")

    try {
      // 1. Get the Blob from canvas
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error("Canvas is empty")
        }

        // 2. Get Signed URL from server action
        // Pass a generic filename, the server action will create a unique path
        const uploadUrlResult = await createAvatarUploadUrl({
          fileName: 'avatar.png', // Server action determines the actual path/name
          contentType: blob.type,
        })

        if (!uploadUrlResult || 'serverError' in uploadUrlResult || 'validationErrors' in uploadUrlResult || !uploadUrlResult.data) {
          throw new Error(uploadUrlResult?.serverError || JSON.stringify(uploadUrlResult?.validationErrors) || "Failed to get upload URL")
        }

        const { signedUrl, path } = uploadUrlResult.data

        // 3. Upload the Blob to Supabase Storage
        const response = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': blob.type },
          body: blob,
        })

        if (!response.ok) {
          // Throw error if the upload HTTP request failed
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        // 4. Update the user profile with the new avatar path
        const updateRefResult = await updateAvatarReference({ newPath: path })

        if (!updateRefResult || 'serverError' in updateRefResult || 'validationErrors' in updateRefResult || !updateRefResult.data?.success) {
          // Attempt to clean up the uploaded file if DB update fails?
          // Maybe log this for manual cleanup.
          console.warn("DB update failed after upload. Uploaded file path:", path)
          throw new Error(updateRefResult?.serverError || JSON.stringify(updateRefResult?.validationErrors) || "Failed to update profile reference")
        }

        // 5. Call sync-metadata endpoint to ensure auth and DB are in sync
        try {
          await fetch('/api/auth/sync-metadata', {
            method: 'GET',
            cache: 'no-store'
          });
          console.log('Metadata sync triggered successfully');
        } catch (syncError) {
          console.warn('Failed to trigger metadata sync (continuing anyway):', syncError);
        }

        // 6. Success!
        toast.success("Avatar updated successfully!")
        onUploadComplete(path) // Notify parent component
        setImgSrc('') // Clear the cropper

      }, 'image/png', 0.9) // Convert to PNG with quality 0.9

    } catch (error) {
      console.error("Avatar upload error:", error)
      toast.error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer ${isDragActive ? 'border-primary' : 'border-muted'}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the image here ...</p>
        ) : (
          <p>Drag 'n' drop an image here, or click to select file</p>
        )}
      </div>

      {imgSrc && (
        <div className="space-y-4">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
          >
            <img
              ref={imgRef}
              alt="Crop me" // Add better alt text
              src={imgSrc}
              onLoad={onImageLoad}
              style={{ maxHeight: '400px' }} // Prevent overly large images
            />
          </ReactCrop>
          <Button
            onClick={handleUploadCroppedImage}
            disabled={!completedCrop || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Cropped Avatar'}
          </Button>
        </div>
      )}

      {/* Optionally display current avatar */}
      {!imgSrc && currentImageUrl && (
        <div>
          <Label>Current Avatar</Label>
          <img src={currentImageUrl} alt="Current Avatar" className="w-20 h-20 rounded-full mt-2" />
        </div>
      )}
    </div>
  )
} 