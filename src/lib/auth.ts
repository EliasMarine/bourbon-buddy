import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import GitHubProvider from 'next-auth/providers/github';
import FacebookProvider from 'next-auth/providers/facebook';
import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter, AdapterUser, AdapterSession } from '@auth/core/adapters';
import { PrismaClientInitializationError, PrismaClientKnownRequestError, PrismaClientUnknownRequestError } from '@prisma/client/runtime/library';
import bcrypt from 'bcryptjs';
import { prisma, getPrismaClient } from './prisma'; // Import getPrismaClient function
import { logSecurityEvent } from './error-handlers';
import { 
  isAccountLocked, 
  isIPBlocked, 
  recordFailedLoginAttempt, 
  resetFailedLoginAttempts 
} from './login-security';
import { redis, sessionStorage } from './redis';

// Define cookie domain based on environment
const getCookieDomain = () => {
  // In development, we want to use localhost
  if (process.env.NODE_ENV !== 'production') return undefined;
  
  // Return undefined in production to let the browser set the domain automatically
  // This is more compatible with prefixed cookies like __Host- and __Secure-
  return undefined;
};

// Create simplified hybrid Redis/Prisma adapter that falls back to Prisma-only when Redis is unavailable
function createRedisEnhancedAdapter() {
  // Get the base Prisma adapter for database operations
  const prismaAdapter = PrismaAdapter(prisma);
  
  // If Redis is not available, just return the Prisma adapter directly
  if (!redis) {
    console.log('Redis not available, using Prisma-only adapter for sessions');
    return prismaAdapter;
  }
  
  // Create our own adapter that uses Redis for sessions
  const adapter: Adapter = {
    // Use all base adapter methods
    ...prismaAdapter,
    
    // Override with Redis-enhanced session methods
    
    // Create session in both Redis and database
    createSession: async (session) => {
      // Store session data in Redis with proper expiration time
      await sessionStorage.setSession(
        session.sessionToken,
        { userId: session.userId },
        Math.floor((session.expires.getTime() - Date.now()) / 1000)
      );
      
      // Return the database session for NextAuth compatibility
      return prismaAdapter.createSession!(session);
    },
    
    // Get session from Redis if possible, fall back to database
    getSessionAndUser: async (sessionToken) => {
      // Try Redis first for better performance
      const redisSession = await sessionStorage.getSession(sessionToken);
      
      if (redisSession?.userId) {
        // If session found in Redis, get user directly
        const user = await safeDbOperation(async (client) => {
          return client.user.findUnique({
            where: { id: redisSession.userId }
          });
        });
        
        if (user) {
          // Also get the full session from database (needed for NextAuth)
          const dbSession = await safeDbOperation(async (client) => {
            return client.session.findUnique({
              where: { sessionToken }
            });
          });
          
          if (dbSession) {
            return {
              user: user as AdapterUser,
              session: dbSession as AdapterSession
            };
          }
        }
      }
      
      // Fall back to database if Redis fails or session not found
      return prismaAdapter.getSessionAndUser!(sessionToken);
    },
    
    // Update session in both Redis and database
    updateSession: async (session) => {
      // Ensure we have all required fields
      if (session.sessionToken && session.userId && session.expires) {
        // Update in Redis
        await sessionStorage.setSession(
          session.sessionToken,
          { userId: session.userId },
          Math.floor((session.expires.getTime() - Date.now()) / 1000)
        );
      }
      
      // Return the database update result for NextAuth compatibility
      return prismaAdapter.updateSession!(session);
    },
    
    // Delete session from both Redis and database
    deleteSession: async (sessionToken) => {
      // Delete from Redis
      await sessionStorage.deleteSession(sessionToken);
      
      // Delete from database and return void explicitly for type compatibility
      await prismaAdapter.deleteSession!(sessionToken);
      // Return void to match the expected return type
      return;
    },
    
    // Handle user lookup methods carefully to avoid prepared statement issues
    getUserByEmail: async (email) => {
      try {
        // Non-null assertion since we know this method exists
        return await prismaAdapter.getUserByEmail!(email);
      } catch (error: any) {
        if (error?.message?.includes('prepared statement') || 
            error instanceof PrismaClientUnknownRequestError ||
            error?.code === '42P05') {
          // Use fresh client for this operation
          const freshPrisma = getPrismaClient();
          const user = await freshPrisma.user.findUnique({
            where: { email }
          });
          return user as AdapterUser | null;
        }
        throw error;
      }
    },
    
    getUserByAccount: async (providerAccountId) => {
      try {
        // Non-null assertion since we know this method exists
        return await prismaAdapter.getUserByAccount!(providerAccountId);
      } catch (error: any) {
        if (error?.message?.includes('prepared statement') || 
            error instanceof PrismaClientUnknownRequestError ||
            error?.code === '42P05') {
          // Use fresh client for this operation
          const freshPrisma = getPrismaClient();
          const account = await freshPrisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: providerAccountId.provider,
                providerAccountId: providerAccountId.providerAccountId,
              },
            },
            select: { user: true },
          });
          return account?.user as AdapterUser | null;
        }
        throw error;
      }
    }
  };
  
  return adapter;
}

// Additional utility function to handle database operations with retry logic
async function safeDbOperation<T>(operation: (client: any) => Promise<T>): Promise<T> {
  try {
    return await operation(prisma);
  } catch (error: any) {
    if (error instanceof PrismaClientUnknownRequestError || 
        (error.message && error.message.includes('prepared statement'))) {
      console.log('Prepared statement error detected, retrying with fresh client');
      const freshPrisma = getPrismaClient();
      return await operation(freshPrisma);
    }
    throw error;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: createRedisEnhancedAdapter(),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID || '',
      clientSecret: process.env.APPLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }
        
        // Normalize email and get IP for security tracking
        const email = credentials.email.toLowerCase().trim();
        // Get the IP from request headers (might be in different places depending on hosting)
        const ip = 
          req?.headers?.['x-forwarded-for'] ||
          req?.headers?.['x-real-ip'] ||
          'unknown';
        
        // Check if IP is blocked due to suspicious activity
        if (isIPBlocked(ip.toString())) {
          logSecurityEvent(
            'blocked_ip_login_attempt',
            { email, ip },
            'high'
          );
          throw new Error('Login temporarily unavailable. Please try again later.');
        }
        
        // Check if account is locked due to too many failed attempts
        if (isAccountLocked(email)) {
          logSecurityEvent(
            'login_attempt_on_locked_account',
            { email, ip },
            'high'
          );
          throw new Error('Your account has been temporarily locked due to multiple failed login attempts. Please try again later or reset your password.');
        }

        try {
          // Wrap the entire authentication logic in safeDbOperation to handle prepared statement conflicts
          return await safeDbOperation(async (dbClient) => {
            const user = await dbClient.user.findUnique({
              where: {
                email: email,
              },
            });

            // Use the same error message whether user exists or not
            // to prevent user enumeration
            if (!user) {
              // Record failed attempt but keep error message generic
              recordFailedLoginAttempt(email, ip.toString());
              logSecurityEvent('failed_login_attempt', { reason: 'user_not_found', email, ip }, 'medium');
              throw new Error('Invalid email or password');
            }

            // Check if password matches
            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              user.password || '' // Ensure password isn't null
            );

            if (!isPasswordValid) {
              // Record failed attempt
              recordFailedLoginAttempt(email, ip.toString());
              logSecurityEvent('failed_login_attempt', { reason: 'invalid_password', userId: user.id, ip }, 'medium');
              throw new Error('Invalid email or password');
            }
            
            // Reset failed attempts on successful login
            resetFailedLoginAttempts(email);
            
            // Log successful login
            logSecurityEvent('successful_login', { userId: user.id, ip }, 'low');

            return {
              id: user.id,
              email: user.email,
              name: user.name,
            };
          });
        } catch (error) {
          // Log the full error for debugging but don't expose it to the client
          console.error('Authentication error:', error);
          
          // Handle database connection issues
          if (error instanceof PrismaClientInitializationError) {
            throw new Error('Authentication service unavailable. Please try again later.');
          } else if (error instanceof PrismaClientKnownRequestError || error instanceof PrismaClientUnknownRequestError) {
            throw new Error('Authentication failed. Please try again later.');
          } else if (error instanceof Error) {
            // If it's our own thrown error, return it
            if (error.message === 'Invalid email or password' || 
                error.message.includes('Your account has been temporarily locked') ||
                error.message.includes('Login temporarily unavailable')) {
              throw error;
            }
            // Otherwise, provide a generic message
            throw new Error('Authentication failed. Please try again later.');
          }
          
          throw new Error('Authentication failed. Please try again later.');
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    secret: process.env.NEXTAUTH_SECRET // Explicitly set the secret to ensure it's used
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }

      try {
        // Fetch the latest user data on each token refresh
        if (token?.id) {
          // Always use a fresh Prisma client to avoid prepared statement errors
          // and wrap in safeDbOperation for additional safety
          const latestUser = await safeDbOperation(async (client) => {
            return await client.user.findUnique({
              where: { id: token.id as string },
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                coverPhoto: true,
                username: true,
                location: true,
                occupation: true,
                education: true,
                bio: true,
                publicProfile: true,
              }
            });
          });
          
          if (latestUser) {
            // Update token with fresh user data
            token = { ...token, ...latestUser };
          }
        }
      } catch (error) {
        // Log the error but don't break authentication
        console.error('Error refreshing user data in JWT callback:', error);
        // Still return the token even if refresh failed
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | undefined;
        session.user.image = token.image as string | undefined;
        session.user.coverPhoto = token.coverPhoto as string | undefined;
        session.user.username = token.username as string | undefined;
        session.user.location = token.location as string | undefined;
        session.user.occupation = token.occupation as string | undefined;
        session.user.education = token.education as string | undefined;
        session.user.bio = token.bio as string | undefined;
        session.user.publicProfile = token.publicProfile as boolean | undefined;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
}; 