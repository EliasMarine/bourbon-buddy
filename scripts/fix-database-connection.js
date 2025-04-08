#!/usr/bin/env node

/**
 * This script fixes database connection issues by:
 * 1. Removing any Supabase pooler URL files
 * 2. Validating DATABASE_URL environment variable
 * 3. Ensuring correct database connection settings
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

console.log('🔍 Checking for database connection issues...');

// Files to check and remove if they exist
const filesToRemove = [
  './supabase/.temp/pooler-url',
  './.vercel/output/config/postgres-pooler-url',
  './.vercel/postgres-pooler-url',
];

// Remove the problematic files
let filesRemoved = 0;
filesToRemove.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      console.log(`Found problematic file at ${filePath}, removing...`);
      fs.unlinkSync(filePath);
      filesRemoved++;
      console.log(`✅ Successfully removed ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error removing file ${filePath}:`, error.message);
  }
});

if (filesRemoved === 0) {
  console.log('✅ No problematic pooler URL files found.');
}

// Check environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

let missingVars = [];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please make sure these are set in your .env.local or environment.');
} else {
  console.log('✅ All required environment variables are set.');
}

// Check if DATABASE_URL contains invalid values
const databaseUrl = process.env.DATABASE_URL || '';
if (databaseUrl.includes('aws-0-us-west-1.pooler.supabase.com')) {
  console.error('❌ DATABASE_URL contains the problematic Supabase pooler URL.');
  console.error('Please update your DATABASE_URL in .env.local or environment variables.');
} else if (databaseUrl.includes('username:password') || databaseUrl.includes('your-database-url')) {
  console.error('❌ DATABASE_URL contains placeholder values.');
  console.error('Please update your DATABASE_URL with actual connection information.');
} else if (databaseUrl) {
  console.log('✅ DATABASE_URL looks valid.');
}

console.log('\n📝 Next steps:');
console.log('1. Make sure your environment variables are correctly set in production');
console.log('2. Run "npx prisma generate" to update the Prisma client');
console.log('3. Redeploy your application');
console.log('\nIf issues persist, check your database credentials and connectivity.'); 