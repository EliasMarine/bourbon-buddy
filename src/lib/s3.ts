import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

// Helper function to validate environment variables and return typed config
function getValidatedS3Config() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;
  const bucketName = process.env.AWS_BUCKET_NAME;
  const endpoint = process.env.AWS_ENDPOINT;

  if (!accessKeyId) throw new Error('Missing AWS_ACCESS_KEY_ID environment variable');
  if (!secretAccessKey) throw new Error('Missing AWS_SECRET_ACCESS_KEY environment variable');
  if (!region) throw new Error('Missing AWS_REGION environment variable');
  if (!bucketName) throw new Error('Missing AWS_BUCKET_NAME environment variable');
  if (!endpoint) throw new Error('Missing AWS_ENDPOINT environment variable');

  return {
    accessKeyId,
    secretAccessKey,
    region,
    bucketName,
    endpoint
  };
}

// Lazy initialization of S3 client
let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    const config = getValidatedS3Config();
    s3ClientInstance = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: `https://${config.endpoint}`,
      forcePathStyle: true,
    });
  }
  return s3ClientInstance;
}

// Modified upload function for Mega S3
export async function uploadToS3(
  file: Buffer, 
  key: string, 
  contentType: string = 'application/octet-stream'
): Promise<string> {
  const s3Client = getS3Client();
  const config = getValidatedS3Config();
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: file,
    ContentType: contentType,
    ACL: 'public-read',
  });

  await s3Client.send(command);
  
  // Construct the URL using Mega's format
  return `https://${config.endpoint}/${config.bucketName}/${key}`;
}

// Function to generate signed upload URL
export async function getSignedUploadUrl(key: string): Promise<string> {
  const s3Client = getS3Client();
  const config = getValidatedS3Config();
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: 'application/octet-stream',
    ACL: 'public-read',
  });

  // Log the command for debugging
  console.log('S3 command details:', {
    bucket: config.bucketName,
    key,
    endpoint: config.endpoint,
    region: config.region,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
} 