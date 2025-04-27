"use server"

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import Mux from '@mux/mux-node'

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

const DeleteVideoSchema = z.object({
  id: z.string().min(1),
})

export async function deleteVideoAction(formData: FormData) {
  const { id } = DeleteVideoSchema.parse({
    id: formData.get('id'),
  })

  // Fetch video from DB
  const video = await prisma.video.findUnique({ where: { id } })
  if (!video) {
    return { error: 'Video not found.' }
  }

  // Delete from Mux if asset exists
  if (video.muxAssetId) {
    try {
      await mux.video.assets.delete(video.muxAssetId)
    } catch (err) {
      // Log but don't block DB deletion
      console.error('Failed to delete Mux asset:', err)
    }
  }

  // Delete from DB
  await prisma.video.delete({ where: { id } })

  return { success: true }
} 