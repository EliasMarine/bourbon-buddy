import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if we have a session
    const sessionInfo = session ? {
      hasSession: true,
      email: session.user?.email,
      name: session.user?.name,
      id: session.user?.id,
    } : {
      hasSession: false
    };
    
    // Check database connection by trying to count users
    let dbStatus = 'unknown';
    let userCount = 0;
    let firstUser = null;
    
    try {
      userCount = await prisma.user.count();
      dbStatus = 'connected';
      
      if (userCount > 0) {
        firstUser = await prisma.user.findFirst({
          select: {
            id: true,
            email: true,
            name: true,
          }
        });
      }
    } catch (dbError) {
      dbStatus = 'error';
      console.error('Database error:', dbError);
    }
    
    // Check if the session user exists in the database
    let sessionUserFound = false;
    if (session?.user?.email) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true }
        });
        
        sessionUserFound = !!user;
      } catch (userError) {
        console.error('Error finding session user:', userError);
      }
    }
    
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      session: sessionInfo,
      database: {
        status: dbStatus,
        userCount,
        firstUser,
        sessionUserFound
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 