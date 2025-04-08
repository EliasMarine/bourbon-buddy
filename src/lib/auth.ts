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
  adapter: redis ? RedisAdapter(redis, prisma) : PrismaAdapter(prisma),
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
        email: { label: "Email", type: "text", placeholder: "john@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("Missing email or password in authorization attempt");
          return null;
        }

        try {
          const normalizedEmail = credentials.email.toLowerCase().trim();
          const lockStatus = await isAccountLocked(normalizedEmail);
          
          if (lockStatus.isLocked) {
            console.warn(`Login attempt for locked account: ${normalizedEmail}`);
            const error = new Error("Account is locked due to too many login attempts");
            error.name = "AccountLockedError";
            throw error;
          }

          const user = await prisma.user.findUnique({
            where: {
              email: normalizedEmail,
            },
          });

          if (!user || !user.password) {
            console.warn(`Login attempt failed: No user found with email ${normalizedEmail}`);
            await recordFailedLoginAttempt(normalizedEmail, false);
            return null;
          }

          const passwordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!passwordValid) {
            console.warn(`Login attempt failed: Invalid password for ${normalizedEmail}`);
            await recordFailedLoginAttempt(normalizedEmail, false);
            return null;
          }

          // Record successful login
          await recordFailedLoginAttempt(normalizedEmail, true);
          console.log(`User ${normalizedEmail} logged in successfully`);

          return user;
        } catch (error) {
          console.error("Error in NextAuth authorize:", error);
          // Rethrow specific errors like AccountLockedError
          if (error.name === "AccountLockedError") {
            throw error;
          }
          // For other errors, return null (authentication failure)
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
      name: process.env.NODE_ENV === "production" ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: undefined
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production" ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: undefined
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production" ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: undefined
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }: { session: any; token?: any }) {
      try {
        if (token && typeof token.id === "string") {
          session.user.id = token.id;
          session.user.email = token.email;
          session.user.name = token.name;
          session.user.image = token.image;
        }
        return session;
      } catch (error) {
        console.error("Error in NextAuth session callback:", error);
        // Return a simplified session object if there's an error
        return {
          user: { 
            id: token?.id || "unknown",
            email: token?.email || session.user?.email || "unknown",
            name: token?.name || session.user?.name || "User"
          },
          expires: session.expires
        };
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
  events: {
    async signIn(message) {
      console.log("User signed in successfully:", message.user.email);
    },
    async signOut(message) {
      console.log("User signed out:", message.token?.email || "Unknown user");
    },
    async error(message) {
      console.error("NextAuth error:", message);
    },
  },
  logger: {
    error(code, metadata) {
      console.error(`NextAuth Error [${code}]:`, metadata);
    },
    warn(code) {
      console.warn(`NextAuth Warning [${code}]`);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`NextAuth Debug [${code}]:`, metadata);
      }
    },
  },
}; 