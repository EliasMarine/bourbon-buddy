import { prisma, disconnectAllPrismaInstances, reconnectPrisma } from './prisma'

/**
 * Reset the Prisma client completely using the unified singleton.
 */
export async function resetPrismaClient() {
  await disconnectAllPrismaInstances()
  await reconnectPrisma()
}

/**
 * Executes a Prisma query with automatic retry for connection errors.
 * Uses the unified singleton.
 */
export async function safePrismaQuery<T>(queryFn: () => Promise<T>): Promise<T> {
  let attempts = 0
  const MAX_ATTEMPTS = 3

  while (attempts < MAX_ATTEMPTS) {
    try {
      return await queryFn()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isPreparedStatementError =
        errorMessage.includes('prepared statement') &&
        (errorMessage.includes('already exists') || errorMessage.includes('does not exist'))
      const isConnectionError =
        isPreparedStatementError ||
        errorMessage.includes('Connection') ||
        errorMessage.includes('could not connect') ||
        errorMessage.includes('bind message supplies')

      if (isConnectionError) {
        attempts++
        console.warn(`Database connection error detected, attempting reset (attempt ${attempts}/${MAX_ATTEMPTS})`)
        await resetPrismaClient()
        continue
      }

      throw error
    }
  }

  throw new Error(`Failed to execute Prisma query after ${MAX_ATTEMPTS} attempts.`)
}

export { prisma } 