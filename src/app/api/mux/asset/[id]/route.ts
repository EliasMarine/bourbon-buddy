import { NextResponse } from 'next/server'
import { deleteMuxAssetById, updateMuxAssetMetadata, getAssetIdFromPlaybackId } from '@/lib/mux'

/**
 * GET - Retrieve MUX asset information using asset ID or playback ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const { searchParams } = new URL(request.url)
    const isPlaybackId = searchParams.get('isPlaybackId') === 'true'
    
    // If this is a playback ID, we need to get the asset ID first
    let assetId = id
    if (isPlaybackId) {
      assetId = await getAssetIdFromPlaybackId(id) || ''
      if (!assetId) {
        return NextResponse.json(
          { error: `Could not find asset ID for playback ID: ${id}` },
          { status: 404 }
        )
      }
    }
    
    // For a real implementation, you would fetch the asset details here
    // const asset = await muxClient.video.assets.retrieve(assetId)
    
    // For now, just return the IDs
    return NextResponse.json({
      assetId,
      playbackId: isPlaybackId ? id : undefined
    })
  } catch (error) {
    console.error('Error retrieving MUX asset:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve MUX asset' },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update MUX asset metadata
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const assetId = params.id
    const { metadata } = await request.json()
    
    if (!metadata) {
      return NextResponse.json(
        { error: 'Metadata is required' },
        { status: 400 }
      )
    }
    
    const result = await updateMuxAssetMetadata(assetId, metadata)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update MUX asset' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Asset metadata updated successfully',
      asset: result.asset
    })
  } catch (error) {
    console.error('Error updating MUX asset:', error)
    return NextResponse.json(
      { error: 'Failed to update MUX asset' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete a MUX asset
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const assetId = params.id
    
    const result = await deleteMuxAssetById(assetId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete MUX asset' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting MUX asset:', error)
    return NextResponse.json(
      { error: 'Failed to delete MUX asset' },
      { status: 500 }
    )
  }
} 