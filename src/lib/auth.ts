import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import GitHubProvider from 'next-auth/providers/github';
import FacebookProvider from 'next-auth/providers/facebook';
import { PrismaClient } from '@prisma/client';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClientInitializationError, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma'; // Use the shared prisma instance
import { logSecurityEvent } from './error-handlers';
import { 
  isAccountLocked, 
  isIPBlocked, 
  recordFailedLoginAttempt, 
  resetFailedLoginAttempts 
} from './login-security';

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
          const user = await prisma.user.findUnique({
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
        } catch (error) {
          // Log the full error for debugging but don't expose it to the client
          console.error('Authentication error:', error);
          
          // Handle database connection issues
          if (error instanceof PrismaClientInitializationError) {
            throw new Error('Authentication service unavailable. Please try again later.');
          } else if (error instanceof PrismaClientKnownRequestError) {
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
  pages: {
    signIn: '/login',
    error: '/login',
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
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

      // Fetch the latest user data on each token refresh
      if (token?.id) {
        const latestUser = await prisma.user.findUnique({
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
        
        if (latestUser) {
          // Update token with fresh user data
          token = { ...token, ...latestUser };
        }
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