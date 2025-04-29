/**
 * This file provides a compatibility layer for Prisma transactions when using Supabase.
 * Since Supabase doesn't directly support transactions in the client, this provides a mock
 * implementation that executes operations sequentially.
 */

import { prisma } from './prisma';

export function withTransaction(fn: (tx: typeof prisma) => Promise<any>) {
  // We don't have real transaction support in Supabase client
  // This is just a simple wrapper that passes through the prisma client
  // Note that this doesn't provide actual transaction guarantees
  return fn(prisma);
}

export default withTransaction; 