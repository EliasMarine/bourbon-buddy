/**
 * ⚠️ MIGRATION NOTICE ⚠️
 * 
 * This project is migrating from Prisma to Supabase.
 * 
 * The 'prisma' export in this file is a stub that throws an error with instructions.
 * If you need database access, please import from '@/lib/supabase' instead.
 * 
 * Usage example:
 * ```
 * import supabase from '@/lib/supabase';
 * 
 * // Query example
 * const { data, error } = await supabase.from('User').select('*');
 * ```
 */

class PrismaMigrationError extends Error {
  constructor() {
    super(
      'This project has migrated from Prisma to Supabase.\n' +
      'Please update your imports to use "@/lib/supabase" instead of "@/lib/prisma".\n' +
      'See the migration guide in the project documentation for more information.'
    );
    this.name = 'PrismaMigrationError';
  }
}

// Export a stub that throws an error
export const prisma = new Proxy({}, {
  get: () => {
    throw new PrismaMigrationError();
  }
});

// Throw immediately when this module is imported
throw new PrismaMigrationError(); 