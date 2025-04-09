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
import { RedisAdapter } from "@/lib/redis-adapter";
import { cookies } from 'next/headers';

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

// Define NextAuth configuration options
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        supabaseSession: { label: "Supabase Session", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials) {
          console.error("No credentials provided in authorization attempt");
          return null;
        }

        // If this is a Supabase session sync, handle it differently
        if (credentials.supabaseSession === 'true' && credentials.email) {
          try {
            console.log(`Authorizing via Supabase session for email: ${credentials.email}`);
            
            // Look up the user by email
            const user = await prisma.user.findUnique({
              where: {
                email: credentials.email.toLowerCase().trim(),
              },
            });

            if (user) {
              console.log(`Found existing user for Supabase session: ${user.email}`);
              return user;
            } else {
              console.warn(`No user found for Supabase session email: ${credentials.email}`);
              return null;
            }
          } catch (error) {
            console.error("Error in Supabase session authorize:", error);
            
            // In case of database error, log the user in if in development
            if (process.env.NODE_ENV === 'development') {
              console.warn("DEV MODE: Allowing login despite database error");
              return {
                id: "temp-user-id",
                email: credentials.email,
                name: "Temporary User"
              };
            }
            return null;
          }
        }

        // Regular email/password login
        if (!credentials.email || !credentials.password) {
          console.error("Missing email or password in authorization attempt");
          return null;
        }

        try {
          const normalizedEmail = credentials.email.toLowerCase().trim();
          
          const user = await prisma.user.findUnique({
            where: {
              email: normalizedEmail,
            },
          });

          if (!user || !user.password) {
            console.warn(`Login attempt failed: No user found with email ${normalizedEmail}`);
            return null;
          }

          const passwordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!passwordValid) {
            console.warn(`Login attempt failed: Invalid password for ${normalizedEmail}`);
            return null;
          }

          console.log(`User ${normalizedEmail} logged in successfully`);
          return user;
        } catch (error) {
          console.error("Error in NextAuth authorize:", error);
          
          // In case of database error, provide a way to log in during development
          if (process.env.NODE_ENV === 'development') {
            console.warn("DEV MODE: Allowing fallback login");
            // Return a temporary user when in development mode
            return {
              id: "temp-user-id",
              email: credentials.email,
              name: "Temporary User"
            };
          }
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
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
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
      }
      
      // Include auth provider tokens if available
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && typeof token.id === 'string') {
        session.user = {
          ...session.user,
          id: token.id,
          email: token.email as string,
          name: token.name as string | null,
          image: token.image as string | null
        };
        
        // Add access and refresh tokens to the session
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
        session.provider = token.provider as string;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

// Helper function to clean auth cookies in responses
export function cleanupAuthCookies(response: Response) {
  const cookiesToClear = [
    'next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
    'sb-access-token',
    'sb-refresh-token',
    'csrf_secret'
  ]
  
  const cleanedResponse = new Response(response.body, response)
  
  cookiesToClear.forEach(name => {
    cleanedResponse.headers.append('Set-Cookie', 
      `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; ${
        process.env.NODE_ENV === 'production' ? 'Secure; ' : ''
      }expires=Thu, 01 Jan 1970 00:00:00 GMT`
    )
  })
  
  return cleanedResponse
} 