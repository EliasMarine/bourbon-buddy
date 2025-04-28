import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('videoId')
  const fixAll = searchParams.get('all') === 'true'
  
  try {
    // Fix a specific video
    if (videoId) {
      const { data: video, error } = await supabaseAdmin
        .from('Video')
        .select('*')
        .eq('id', videoId)
        .single()
        
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      
      // Check if this video needs fixing
      const needsFix = !video.muxAssetId || 
                      video.muxPlaybackId?.startsWith('placeholder-') ||
                      (video.status === 'ready' && !video.muxPlaybackId);
      
      if (needsFix) {
        // Fix the video by setting status to needs_upload and clearing placeholder IDs
        const updates: Record<string, any> = { 
          status: 'needs_upload' 
        };
        
        if (video.muxPlaybackId?.startsWith('placeholder-')) {
          updates.muxPlaybackId = null;
        }
        
        const { error: updateError } = await supabaseAdmin
          .from('Video')
          .update(updates)
          .eq('id', videoId);
          
        if (updateError) {
          return NextResponse.json(
            { error: updateError.message },
            { status: 500 }
          );
        }
        
        // Revalidate relevant paths to update UI
        revalidatePath('/past-tastings');
        revalidatePath('/watch/[id]', 'page');
        revalidatePath(`/watch/${videoId}`);
        
        return NextResponse.json({
          success: true,
          message: 'Video marked as needs_upload',
          updated: true,
          previousStatus: video.status,
          newStatus: 'needs_upload',
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Video is already in correct status',
        updated: false,
      });
    }
    
    // Fix all problematic videos if fixAll is true
    if (fixAll) {
      // Find all videos with issues
      const { data: videos, error } = await supabaseAdmin
        .from('Video')
        .select('id, status, muxAssetId, muxPlaybackId')
        
      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        )
      }
      
      const results = {
        fixed: 0,
        skipped: 0,
        errors: 0,
        details: [] as Array<{ id: string; action: string; }>
      };
      
      // Process each video
      for (const video of videos) {
        const needsFix = !video.muxAssetId || 
                        video.muxPlaybackId?.startsWith('placeholder-') ||
                        (video.status === 'ready' && !video.muxPlaybackId);
                        
        if (needsFix) {
          // Fix the video by setting status to needs_upload and clearing placeholder IDs
          const updates: Record<string, any> = { 
            status: 'needs_upload' 
          };
          
          if (video.muxPlaybackId?.startsWith('placeholder-')) {
            updates.muxPlaybackId = null;
          }
          
          const { error: updateError } = await supabaseAdmin
            .from('Video')
            .update(updates)
            .eq('id', video.id);
            
          if (updateError) {
            results.errors++;
            results.details.push({ id: video.id, action: 'error: ' + updateError.message });
          } else {
            results.fixed++;
            results.details.push({ id: video.id, action: 'marked_needs_upload' });
          }
        } else {
          results.skipped++;
          results.details.push({ id: video.id, action: 'skipped' });
        }
      }
      
      // Revalidate relevant paths to update UI
      revalidatePath('/past-tastings');
      revalidatePath('/watch/[id]', 'page');
      
      return NextResponse.json({
        success: true,
        message: `Fixed ${results.fixed} videos`,
        results
      });
    }
    
    return NextResponse.json({
      error: 'Missing videoId or all=true parameter',
    }, { status: 400 });
    
  } catch (error: any) {
    console.error('Error in fix video endpoint:', error.message)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
} 