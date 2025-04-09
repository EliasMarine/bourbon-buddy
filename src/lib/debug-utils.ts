/**
 * Utilities for debugging and logging
 */

/**
 * Generates a short random ID for tracing requests through logs
 * @returns A random string ID
 */
export function generateDebugId(): string {
  return Math.random().toString(36).substring(2, 8)
}

/**
 * Masks sensitive information for logging
 * @param value The value to mask
 * @param visibleChars Number of characters to show at the beginning
 * @returns Masked string
 */
export function maskSensitiveValue(value: string, visibleChars = 4): string {
  if (!value) return ''
  if (value.length <= visibleChars) return '*'.repeat(value.length)
  return value.substring(0, visibleChars) + '*'.repeat(4)
}

/**
 * Safely stringifies an object for logging
 * @param obj Object to stringify
 * @returns Safe string representation
 */
export function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, (key, value) => {
      // Mask sensitive keys
      if (['password', 'token', 'secret', 'key'].some(k => key.toLowerCase().includes(k))) {
        return typeof value === 'string' ? maskSensitiveValue(value) : '[REDACTED]'
      }
      return value
    })
  } catch (error) {
    return '[Object could not be stringified]'
  }
} 