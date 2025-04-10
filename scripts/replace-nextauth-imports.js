#!/usr/bin/env node

/**
 * Script to replace next-auth imports with Supabase Auth imports across the codebase
 * 
 * Usage:
 * node scripts/replace-nextauth-imports.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Define the replacements to make
const replacements = [
  {
    from: /import\s+\{\s*useSession(?:,\s*signOut)?\s*\}\s+from\s+['"]next-auth\/react['"]/g,
    to: "import { useSupabaseSession } from '@/hooks/use-supabase-session'"
  },
  {
    from: /import\s+\{\s*getServerSession\s*\}\s+from\s+['"]next-auth(?:\/next)?['"]/g,
    to: "import { getCurrentUser } from '@/lib/supabase-auth'"
  },
  {
    from: /const\s+\{\s*data\s*:\s*session,\s*status\s*\}\s*=\s*useSession\(\)/g,
    to: "const { data: session, status } = useSupabaseSession()"
  },
  {
    from: /const\s+\{\s*data\s*:\s*session,\s*status\s*\}\s*=\s*useSession\(\{\s*required\s*:\s*true\s*\}\)/g,
    to: "const { data: session, status } = useSupabaseSession({ required: true })"
  },
  {
    from: /const\s+session\s*=\s*await\s+getServerSession\(\)/g,
    to: "const user = await getCurrentUser()"
  },
  {
    from: /const\s+session\s*=\s*await\s+getServerSession\(authOptions\)/g,
    to: "const user = await getCurrentUser()"
  },
  {
    from: /import\s+\{\s*authOptions\s*\}\s+from\s+['"]@\/lib\/auth['"]/g,
    to: "// Removed authOptions import - not needed with Supabase Auth"
  },
  {
    from: /session\?\.user/g,
    to: "user"
  },
  {
    from: /onClick\s*\(\)\s*\=\>\s*signOut\(\)/g,
    to: "onClick={() => signOut && signOut()}"
  }
];

// Function to process a file
async function processFile(filePath) {
  try {
    // Read the file
    const content = await readFileAsync(filePath, 'utf8');
    
    // Apply replacements
    let newContent = content;
    let changesApplied = false;
    
    for (const { from, to } of replacements) {
      if (from.test(newContent)) {
        newContent = newContent.replace(from, to);
        changesApplied = true;
      }
    }
    
    // Only write the file if changes were made
    if (changesApplied) {
      await writeFileAsync(filePath, newContent, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

// Find files with next-auth imports
async function findNextAuthFiles() {
  try {
    const { stdout } = await execAsync('grep -l "next-auth" --include="*.ts" --include="*.tsx" -r src/');
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error finding next-auth files:', error);
    return [];
  }
}

// Main function
async function main() {
  console.log('🔍 Finding files with next-auth imports...');
  const files = await findNextAuthFiles();
  
  if (files.length === 0) {
    console.log('✅ No files found with next-auth imports.');
    return;
  }
  
  console.log(`🔄 Found ${files.length} files with next-auth imports.`);
  
  let updatedCount = 0;
  let errors = [];
  
  for (const file of files) {
    try {
      const wasUpdated = await processFile(file);
      if (wasUpdated) {
        console.log(`✅ Updated ${file}`);
        updatedCount++;
      } else {
        console.log(`⏭️ No changes needed in ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
      errors.push({ file, error });
    }
  }
  
  console.log('\n===== Summary =====');
  console.log(`✅ ${updatedCount} files updated`);
  console.log(`⏭️ ${files.length - updatedCount - errors.length} files unchanged`);
  console.log(`❌ ${errors.length} errors`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(({ file, error }) => {
      console.log(`- ${file}: ${error.message}`);
    });
  }
  
  console.log('\n🔄 Migration script completed!');
  console.log('\n⚠️ Note: This script performs automated replacements, but manual review is still recommended.');
  console.log('You may need to make additional adjustments to complete the migration.');
}

main().catch(console.error); 