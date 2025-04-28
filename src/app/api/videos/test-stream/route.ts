import { NextResponse } from 'next/server'
import * as jose from 'jose'

// Helper function to generate JWT token for Mux signed URLs
async function generateToken(playbackId: string, keyId: string, privateKey: string, expirationMinutes: number) {
  try {
    // Decode the base64 private key
    const decodedKey = Buffer.from(privateKey, 'base64')
    
    // Parse the RSA private key
    const key = await jose.importPKCS8(decodedKey.toString(), 'RS256')
    
    // Calculate expiration time in seconds from now
    const exp = Math.floor(Date.now() / 1000) + (expirationMinutes * 60)
    
    // Create the JWT token
    const token = await new jose.SignJWT({
      sub: playbackId,
      aud: 'v', // 'v' for Video
      exp
    })
      .setProtectedHeader({ alg: 'RS256', kid: keyId })
      .sign(key)
    
    return token
  } catch (error: any) {
    console.error('Error generating JWT token:', error.message)
    throw new Error(`Failed to generate signed token: ${error.message}`)
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const playbackId = searchParams.get('playbackId')
  
  // New parameters for signed URLs
  const useSignedUrl = searchParams.get('useSignedUrl') === 'true'
  const keyId = searchParams.get('keyId')
  const privateKey = searchParams.get('privateKey')
  const expirationMinutes = parseInt(searchParams.get('expirationMinutes') || '60', 10)
  
  if (!playbackId) {
    return NextResponse.json({ 
      error: 'Missing playbackId parameter' 
    }, { status: 400 })
  }
  
  try {
    let hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`
    let token = '';
    
    // If using signed URL and we have required parameters, generate a token
    if (useSignedUrl && keyId && privateKey) {
      try {
        token = await generateToken(
          playbackId, 
          keyId, 
          decodeURIComponent(privateKey), 
          expirationMinutes
        )
        
        // Add the token to the URL
        hlsUrl = `${hlsUrl}?token=${token}`
      } catch (signError: any) {
        return NextResponse.json({
          success: false,
          playbackId,
          error: signError.message,
          message: `Error generating signed URL: ${signError.message}`,
          recommendations: [
            'Check that your key ID is correct',
            'Ensure your private key is properly base64 encoded',
            'Verify that you have the correct permissions for this signing key'
          ]
        }, { status: 500 })
      }
    }
    
    // Fetch the HLS manifest directly to check if it's accessible
    const response = await fetch(hlsUrl, { 
      method: 'HEAD',
      // Using short timeout to quickly detect issues
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      let recommendations = [
        'Verify the playbackId is valid',
        'Check if the asset exists in Mux dashboard'
      ]
      
      // Add recommendations specific to signed URLs
      if (response.status === 403) {
        if (!useSignedUrl) {
          recommendations = [
            'This video likely uses a signed playback policy',
            'Enable "Use Signed URL" and provide your signing key details',
            'Or change the playback policy to "public" in your Mux dashboard'
          ]
        } else {
          recommendations = [
            'Check that your signing key ID is correct',
            'Verify that your private key is valid',
            'Confirm that this key has permission to sign for this playback ID'
          ]
        }
      }
      
      return NextResponse.json({
        success: false,
        playbackId,
        hlsUrl: hlsUrl.split('?')[0], // Don't include token in the response
        useSignedUrl,
        status: response.status,
        statusText: response.statusText,
        message: `Stream check failed: ${response.status} ${response.statusText}`,
        recommendations
      })
    }
    
    // Return success with playback details
    return NextResponse.json({
      success: true,
      playbackId,
      hlsUrl,
      useSignedUrl,
      token: token || undefined,
      status: response.status,
      statusText: response.statusText,
      message: 'Stream is accessible',
      test: {
        directUrl: hlsUrl,
        player: `/test-player?playbackId=${playbackId}${useSignedUrl ? '&signed=true' : ''}`,
        videoElement: `<video controls src="${hlsUrl}" style="width:100%;max-width:640px;"></video>`
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      playbackId,
      error: error.message,
      message: `Error testing stream: ${error.message}`,
      recommendations: [
        'Check your internet connection',
        'Verify the playbackId format is correct',
        'Try again in a few moments'
      ]
    }, { status: 500 })
  }
} 