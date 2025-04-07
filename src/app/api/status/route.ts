import { NextResponse } from 'next/server';
import { prisma, isDatabaseConnected } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Define interface for the status response
interface SystemStatus {
  status: string;
  timestamp: string;
  environment: string;
  databaseConnection: boolean;
  databaseUrl: string;
  serverInfo: {
    platform: string;
    nodeVersion: string;
    uptime: number;
  };
  databaseStats?: {
    userCount?: number;
    connectedAt?: string;
    error?: string;
  };
}

export async function GET(request: Request) {
  // Check authorization for sensitive information
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session?.user;
  
  // Create basic status object
  const status: SystemStatus = {
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    databaseConnection: false,
    databaseUrl: '',
    serverInfo: {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime())
    }
  };
  
  try {
    // Check database connection
    const dbConnected = await isDatabaseConnected();
    status.databaseConnection = dbConnected;
    
    // For authenticated users only, provide database URL information (masked)
    if (isAuthenticated && process.env.DATABASE_URL) {
      // Mask sensitive parts of the database URL
      const dbUrlParts = process.env.DATABASE_URL.split('@');
      if (dbUrlParts.length > 1) {
        // Extract host and port
        const hostPart = dbUrlParts[1].split('/')[0];
        status.databaseUrl = `****@${hostPart}`;
      } else {
        status.databaseUrl = 'Invalid database URL format';
      }
    }
    
    // Additional database info for authenticated users
    if (isAuthenticated && status.databaseConnection) {
      try {
        // Check user count as a test query
        const userCount = await prisma.user.count();
        status.databaseStats = {
          userCount,
          connectedAt: new Date().toISOString()
        };
      } catch (e) {
        console.error('Error getting database stats:', e);
        status.databaseStats = { error: 'Failed to retrieve stats' };
      }
    }
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to retrieve system status',
      databaseConnection: false
    }, { status: 500 });
  }
} 