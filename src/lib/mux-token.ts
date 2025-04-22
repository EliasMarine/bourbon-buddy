import jwt from 'jsonwebtoken';

/**
 * Creates a signed JWT token for MUX video playback
 * Used for securing access to videos with a 'signed' playback policy
 */
export function createMuxSignedPlaybackToken({
  playbackId,
  signingKeyId,
  privateKey,
  expirationTimeInSeconds = 3600 // 1 hour
}: {
  playbackId: string;
  signingKeyId: string;
  privateKey: string;
  expirationTimeInSeconds?: number;
}): string {
  try {
    // Create the JWT claims
    const claims = {
      sub: playbackId,
      aud: 'v', // 'v' for video playback
      exp: Math.floor(Date.now() / 1000) + expirationTimeInSeconds,
      kid: signingKeyId
    };

    // Sign the JWT with the private key
    const token = jwt.sign(claims, privateKey, {
      algorithm: 'RS256',
      header: {
        typ: 'JWT',
        alg: 'RS256',
        kid: signingKeyId
      }
    });

    return token;
  } catch (error) {
    console.error('Error creating MUX signed playback token:', error);
    throw new Error('Failed to create MUX signed playback token');
  }
}

/**
 * Creates a signed URL for MUX video playback
 */
export function createMuxSignedPlaybackUrl({
  playbackId,
  token
}: {
  playbackId: string;
  token: string;
}): string {
  return `https://stream.mux.com/${playbackId}.m3u8?token=${token}`;
}

/**
 * Creates a signed JWT token and URL for MUX video in one function
 */
export function createMuxSignedAssetUrl({
  playbackId,
  signingKeyId,
  privateKey,
  expirationTimeInSeconds = 3600 // 1 hour
}: {
  playbackId: string;
  signingKeyId: string;
  privateKey: string;
  expirationTimeInSeconds?: number;
}): string {
  const token = createMuxSignedPlaybackToken({
    playbackId,
    signingKeyId,
    privateKey,
    expirationTimeInSeconds
  });
  
  return createMuxSignedPlaybackUrl({ playbackId, token });
} 