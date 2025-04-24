#!/usr/bin/env node

/**
 * Fix Supabase Connection Script
 * 
 * This script helps fix common issues with Supabase PostgreSQL connection strings,
 * particularly for the "prepared statement s0 already exists" error.
 * 
 * Usage:
 * 1. Run `node scripts/fix-supabase-connection.js`
 * 2. The script will check your .env.local file and fix the DATABASE_URL
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Path to .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');

console.log('🔧 Supabase Connection Fix Script');
console.log('--------------------------------');

// Function to modify DATABASE_URL to work properly with Prisma and PgBouncer
function fixDatabaseUrl(url) {
  if (!url) return null;
  
  // Already has the pgbouncer parameter
  if (url.includes('pgbouncer=true')) {
    console.log('✅ DATABASE_URL already includes pgbouncer=true parameter');
    
    // Check for other required parameters
    if (!url.includes('connection_limit=')) {
      url += '&connection_limit=1';
      console.log('✅ Added connection_limit=1 parameter');
    }
    
    if (!url.includes('pool_timeout=')) {
      url += '&pool_timeout=10';
      console.log('✅ Added pool_timeout=10 parameter');
    }
    
    return url;
  }
  
  // Add the pgbouncer and other parameters
  const separator = url.includes('?') ? '&' : '?';
  const fixedUrl = `${url}${separator}pgbouncer=true&connection_limit=1&pool_timeout=10`;
  console.log('✅ Added pgbouncer=true and connection parameters to DATABASE_URL');
  
  return fixedUrl;
}

// Function to save updated DATABASE_URL to .env.local
function saveToEnvLocal(updatedUrl) {
  try {
    // Read the current content of .env.local
    let envContent = '';
    try {
      envContent = fs.readFileSync(envLocalPath, 'utf8');
    } catch (err) {
      console.log('⚠️ Could not read .env.local file, creating a new one');
      envContent = '';
    }
    
    // Check if DATABASE_URL exists in the file
    const dbUrlRegex = /^DATABASE_URL=[^\n]+/m;
    
    if (dbUrlRegex.test(envContent)) {
      // Replace the existing DATABASE_URL line
      envContent = envContent.replace(
        dbUrlRegex,
        `DATABASE_URL="${updatedUrl}"`
      );
    } else {
      // Add a new DATABASE_URL line
      envContent += `\nDATABASE_URL="${updatedUrl}"`;
    }
    
    // Write the updated content back to .env.local
    fs.writeFileSync(envLocalPath, envContent);
    console.log(`✅ Successfully updated DATABASE_URL in ${envLocalPath}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to update .env.local file:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('Checking DATABASE_URL...');
  
  // Get the current DATABASE_URL
  const currentUrl = process.env.DATABASE_URL;
  
  if (!currentUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    return false;
  }
  
  console.log(`Found DATABASE_URL: ${currentUrl.substring(0, 30)}...`);
  
  // Fix the URL
  const fixedUrl = fixDatabaseUrl(currentUrl);
  
  if (!fixedUrl) {
    console.error('❌ Could not fix DATABASE_URL');
    return false;
  }
  
  // Save to .env.local
  const saved = saveToEnvLocal(fixedUrl);
  
  if (saved) {
    console.log('\n✅ DATABASE_URL has been updated successfully!');
    console.log('🚨 IMPORTANT: Restart your development server to apply these changes.');
    console.log('Run: npm run dev:realtime\n');
  } else {
    console.error('\n❌ Failed to update DATABASE_URL');
    console.log('Please manually update your .env.local file with the following parameter:');
    console.log(`DATABASE_URL="${fixedUrl}"\n`);
  }
  
  return saved;
}

// Run the script
main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Error running the script:', error);
    process.exit(1);
  }); 