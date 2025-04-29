#!/usr/bin/env node

/**
 * Script to check for and fix database connection issues in deployment
 * - Checks for direct-pooler URLs in prisma/schema.prisma
 * - Verifies DATABASE_URL is properly set
 * - In newer versions, also handles Supabase migration
 */

const fs = require('fs');
const path = require('path');

// Check environment variables
function checkEnvironmentVariables() {
  // Legacy Prisma checks
  const hasDatabase = !!process.env.DATABASE_URL;
  const databaseUrl = process.env.DATABASE_URL || '';
  const hasPrisma = databaseUrl.includes('postgres');

  // Supabase checks
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSupabaseServiceKey = !!process.env.SUPABASE_SERVICE_KEY;

  console.log('🔍 Checking for database connection issues...');

  // Migration check - if we have both Prisma and Supabase configs
  const isInMigration = hasPrisma && (hasSupabaseUrl || hasSupabaseKey);

  if (isInMigration) {
    console.log('⚠️ Detected both Prisma and Supabase configurations.');
    console.log('✅ Project is being migrated from Prisma to Supabase.');
  } else if (hasSupabaseUrl && hasSupabaseKey) {
    console.log('✅ Supabase configuration detected.');
  } else if (hasPrisma) {
    console.log('⚠️ Legacy Prisma configuration detected. Consider migrating to Supabase.');
  }

  const missingVars = [];
  if (!hasSupabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!hasSupabaseKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missingVars.length > 0) {
    console.log(`❌ Missing required Supabase environment variables: ${missingVars.join(', ')}`);
    console.log(`   Please set these in your environment or .env file.`);
  } else {
    console.log('✅ All required environment variables are set.');
  }

  // Still check legacy DATABASE_URL for backwards compatibility
  if (hasDatabase) {
    if (databaseUrl.includes('pooler.supabase.com')) {
      console.warn('⚠️ WARNING: Direct pooler URL detected in DATABASE_URL!');
      console.warn('   This can cause connection issues. Use the standard Supabase connection string instead.');
    } else if (databaseUrl.includes('supabase')) {
      console.log('✅ DATABASE_URL looks valid (Supabase connection).');
    } else if (databaseUrl.includes('postgres')) {
      console.log('✅ DATABASE_URL looks valid (PostgreSQL connection).');
    }
  }

  return {
    hasSupabaseConfig: hasSupabaseUrl && hasSupabaseKey,
    isInMigration
  };
}

// Check for problematic pooler URLs in prisma/schema.prisma
function checkPoolerInFiles() {
  const prismaFiles = [
    'prisma/schema.prisma',
    'src/lib/prisma.ts', 
    'src/lib/db.ts'
  ];

  let foundProblematicFiles = false;

  prismaFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('pooler.supabase.com')) {
        console.error(`❌ Direct pooler URL found in ${filePath}!`);
        console.error(`   This will cause connection issues. Use standard connection string instead.`);
        foundProblematicFiles = true;
      } 
    }
  });

  if (!foundProblematicFiles) {
    console.log('✅ No problematic pooler URL files found.');
  }

  return !foundProblematicFiles;
}

// Main execution
const env = checkEnvironmentVariables();
const filesOk = checkPoolerInFiles();

console.log('\n📝 Next steps:');
if (env.hasSupabaseConfig) {
  console.log('1. Make sure your environment variables are correctly set in production');
  if (env.isInMigration) {
    console.log('2. Run "node scripts/fix-prisma-imports.js" to update files still using Prisma');
    console.log('3. Redeploy your application');
  } else {
    console.log('2. Redeploy your application');
  }
} else {
  console.log('1. Set up your Supabase environment variables');
  console.log('2. Run "node scripts/fix-prisma-imports.js" to update files still using Prisma');
  console.log('3. Redeploy your application');
}

console.log('\nIf issues persist, check your database credentials and connectivity.');

// Exit with error code if critical issues found
if (!env.hasSupabaseConfig) {
  // Don't exit with error in development - allow for gradual migration
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
} 