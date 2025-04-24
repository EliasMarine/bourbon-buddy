#!/usr/bin/env node

/**
 * Manual Database URL Fix Script
 * 
 * This script helps you manually update your .env.local file with the correct DATABASE_URL
 * to fix the "prepared statement s0 already exists" error.
 * 
 * Usage:
 * 1. Run `node scripts/fix-database-url-manual.mjs`
 * 2. Follow the instructions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');

console.log('🔧 Manual DATABASE_URL Fix Script');
console.log('--------------------------------');
console.log('This script will help you fix your DATABASE_URL to resolve the');
console.log('"prepared statement s0 already exists" error with Supabase/Prisma.\n');

// Check if .env.local exists
let envLocalExists = false;
try {
  envLocalExists = fs.existsSync(envLocalPath);
  if (envLocalExists) {
    console.log(`✅ Found .env.local at ${envLocalPath}`);
  } else {
    console.log(`⚠️ Could not find .env.local at ${envLocalPath}`);
    console.log('Creating a new file...');
  }
} catch (err) {
  console.error('❌ Error checking for .env.local file:', err);
}

// Instructions for the user
console.log('\n🔍 Follow these steps:');
console.log('1. Open your .env.local file located at:');
console.log(`   ${envLocalPath}`);
console.log('\n2. Find or add this line with YOUR actual Supabase database details:');
console.log('   DATABASE_URL="postgresql://postgres:YourPassword@YourHost:5432/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10"');
console.log('\n3. Make sure to replace:');
console.log('   - "YourPassword" with your actual Supabase database password');
console.log('   - "YourHost" with your actual Supabase host (from the connection string)');
console.log('\n4. Save the file and restart your development server:');
console.log('   npm run dev:realtime');

// Create example file for convenience
let exampleContent = '';
if (envLocalExists) {
  try {
    // Read existing file
    exampleContent = fs.readFileSync(envLocalPath, 'utf8');
    
    // Check if DATABASE_URL exists, and replace or add it
    if (exampleContent.includes('DATABASE_URL=')) {
      exampleContent = exampleContent.replace(
        /DATABASE_URL=.*(\r?\n|$)/g, 
        'DATABASE_URL="postgresql://postgres:YourPassword@YourHost:5432/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10"\n'
      );
    } else {
      exampleContent += '\nDATABASE_URL="postgresql://postgres:YourPassword@YourHost:5432/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10"\n';
    }
  } catch (err) {
    console.error('❌ Error reading .env.local file:', err);
    exampleContent = 'DATABASE_URL="postgresql://postgres:YourPassword@YourHost:5432/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10"\n';
  }
} else {
  // Create new content
  exampleContent = 'DATABASE_URL="postgresql://postgres:YourPassword@YourHost:5432/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10"\n';
}

// Write example .env.local.example file
const examplePath = path.resolve(process.cwd(), '.env.local.example');
try {
  fs.writeFileSync(examplePath, exampleContent);
  console.log(`\n✅ Created example file at ${examplePath}`);
  console.log('You can use this as a reference.');
} catch (err) {
  console.error('❌ Error creating example file:', err);
}

console.log('\n✨ Find your Supabase connection details in your Supabase dashboard:');
console.log('1. Log in to Supabase (https://app.supabase.io)');
console.log('2. Open your project');
console.log('3. Go to Project Settings > Database');
console.log('4. Find "Connection string" or "URI" under "Connection Info"');
console.log('5. Use that string but add the pgbouncer parameters');

console.log('\n🔧 For more detailed instructions, see docs/fix-prepared-statement-error.md'); 