import { PrismaClient } from "@prisma/client";
import { Redis } from "ioredis";
import { Adapter, AdapterUser, AdapterSession } from "@auth/core/adapters";

/**
 * Redis adapter for NextAuth that uses Redis for sessions and falls back to Prisma for user data
 * This provides better performance for session operations while maintaining compatibility with Prisma
 */
export function RedisAdapter(redis: Redis, prisma: PrismaClient): Adapter {
  // Session key prefix for Redis
  const sessionPrefix = "nextauth:session:";
  // Default TTL for sessions (30 days in seconds)
  const defaultSessionTTL = 30 * 24 * 60 * 60;

  return {
    // User methods
    async createUser(user) {
      return prisma.user.create({
        data: user,
      }) as Promise<AdapterUser>;
    },

    async getUser(id) {
      return prisma.user.findUnique({
        where: { id },
      }) as Promise<AdapterUser | null>;
    },

    async getUserByEmail(email) {
      return prisma.user.findUnique({
        where: { email },
      }) as Promise<AdapterUser | null>;
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
        include: { user: true },
      });
      return account?.user as AdapterUser | null;
    },

    async updateUser(user) {
      return prisma.user.update({
        where: { id: user.id },
        data: user,
      }) as Promise<AdapterUser>;
    },

    async deleteUser(userId) {
      await prisma.user.delete({
        where: { id: userId },
      });
    },

    // Account methods
    async linkAccount(account) {
      await prisma.account.create({
        data: account,
      });
      return account;
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await prisma.account.delete({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
      });
    },

    // Session methods with Redis integration
    async createSession(session) {
      // Store in Redis with expiration
      const redisKey = `${sessionPrefix}${session.sessionToken}`;
      const expiresAt = Math.floor(
        (new Date(session.expires).getTime() - Date.now()) / 1000
      );

      // Store minimal data in Redis
      await redis.set(
        redisKey, 
        JSON.stringify({ 
          userId: session.userId,
          expires: session.expires
        }),
        "EX",
        expiresAt > 0 ? expiresAt : defaultSessionTTL
      );

      // Also store in Prisma as fallback and for compatibility
      return prisma.session.create({
        data: session,
      }) as Promise<AdapterSession>;
    },

    async getSessionAndUser(sessionToken) {
      // Try Redis first for better performance
      const redisKey = `${sessionPrefix}${sessionToken}`;
      const redisSession = await redis.get(redisKey);

      if (redisSession) {
        try {
          const { userId } = JSON.parse(redisSession);
          
          // Get user from database
          const user = await prisma.user.findUnique({
            where: { id: userId },
          });

          if (user) {
            // Get the full session data from Prisma (needed for NextAuth)
            const session = await prisma.session.findUnique({
              where: { sessionToken },
            });

            if (session) {
              return {
                user: user as AdapterUser,
                session: session as AdapterSession,
              };
            }
          }
        } catch (error) {
          console.error("Error parsing Redis session data:", error);
          // Continue to fallback on error
        }
      }

      // Fallback to Prisma
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (!session) return null;

      return {
        user: session.user as AdapterUser,
        session: {
          id: session.id,
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
        },
      };
    },

    async updateSession(session) {
      // Update in Redis
      if (session.sessionToken) {
        const redisKey = `${sessionPrefix}${session.sessionToken}`;
        
        if (session.expires) {
          const expiresAt = Math.floor(
            (new Date(session.expires).getTime() - Date.now()) / 1000
          );
          
          await redis.set(
            redisKey,
            JSON.stringify({
              userId: session.userId,
              expires: session.expires,
            }),
            "EX",
            expiresAt > 0 ? expiresAt : defaultSessionTTL
          );
        }
      }

      // Update in Prisma
      return prisma.session.update({
        where: { sessionToken: session.sessionToken },
        data: session,
      }) as Promise<AdapterSession>;
    },

    async deleteSession(sessionToken) {
      // Delete from Redis
      const redisKey = `${sessionPrefix}${sessionToken}`;
      await redis.del(redisKey);

      // Delete from Prisma
      await prisma.session.delete({
        where: { sessionToken },
      });
    },

    // Verification token methods
    async createVerificationToken(token) {
      return prisma.verificationToken.create({
        data: token,
      });
    },

    async useVerificationToken({ identifier, token }) {
      try {
        return await prisma.verificationToken.delete({
          where: {
            identifier_token: {
              identifier,
              token,
            },
          },
        });
      } catch {
        return null;
      }
    },
  };
} 