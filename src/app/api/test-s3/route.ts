import { NextResponse } from 'next/server';
import { getS3Client } from '@/lib/s3';
import { ListBucketsCommand } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    // Return the S3 configuration for debugging
    const config = {
      region: process.env.AWS_REGION,
      endpoint: process.env.AWS_ENDPOINT,
      bucket: process.env.AWS_BUCKET_NAME,
      publicEndpoint: process.env.NEXT_PUBLIC_AWS_ENDPOINT,
      publicBucket: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME,
      publicRegion: process.env.NEXT_PUBLIC_AWS_REGION,
    };

    // Test the S3 connection by listing buckets
    try {
      const s3Client = getS3Client();
      const listBucketsCommand = new ListBucketsCommand({});
      const listBucketsResponse = await s3Client.send(listBucketsCommand);
      return NextResponse.json({ 
        config,
        buckets: listBucketsResponse.Buckets,
        message: 'S3 connection successful' 
      });
    } catch (error: any) {
      return NextResponse.json({ 
        config,
        error: error.message || 'Unknown error',
        stack: error.stack || 'No stack trace',
        message: 'S3 connection failed'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error testing S3:', error);
    return NextResponse.json(
      { error: 'Error testing S3 configuration', details: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 