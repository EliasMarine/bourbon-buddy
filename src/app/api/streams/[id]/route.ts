import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/streams/[id] - Get a specific stream
export async function GET(request: NextRequest) {
  try {
    // Extract the ID from the URL
    const streamId = request.nextUrl.pathname.split('/').pop();
    const session = await getServerSession(authOptions);
    
    console.log('Fetching stream with ID:', streamId);

    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
        spirit: {
          select: {
            id: true,
            name: true,
            brand: true,
            type: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Return stream wrapped in a 'stream' property to match client expectations
    return NextResponse.json({ stream });
  } catch (error) {
    console.error('Error fetching stream:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/streams/[id] - Update a stream (host only)
export async function PUT(request: NextRequest) {
  try {
    // Extract the ID from the URL
    const streamId = request.nextUrl.pathname.split('/').pop();
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      include: { host: true },
    });

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Check if the user is the host
    if (stream.host.email !== session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized - you are not the host of this stream' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    const updatedStream = await prisma.stream.update({
      where: { id: streamId },
      data: {
        title: body.title,
        description: body.description,
        isLive: body.isLive,
      },
    });

    // Return updated stream wrapped in a 'stream' property
    return NextResponse.json({ stream: updatedStream });
  } catch (error) {
    console.error('Error updating stream:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/streams/[id] - Delete a stream (host only)
export async function DELETE(request: NextRequest) {
  try {
    // Extract the ID from the URL
    const streamId = request.nextUrl.pathname.split('/').pop();
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
      include: { host: true },
    });

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Check if the user is the host
    if (stream.host.email !== session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized - you are not the host of this stream' },
        { status: 403 }
      );
    }

    await prisma.stream.delete({
      where: { id: streamId },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Stream deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting stream:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 