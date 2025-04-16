#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files with reported errors
const filesToFix = [
  'src/app/collection/add/page.tsx',
  'src/app/collection/page.tsx',
  'src/app/collection/spirit/[id]/edit/page.tsx',
  'src/app/collection/spirit/[id]/page.tsx',
  'src/app/dashboard/page.tsx',
  // Add files using useSession directly
  'src/app/profile/appearance/page.tsx',
  'src/app/profile/edit/page.tsx',
  'src/app/profile/page.tsx',
  'src/app/streams/create/page.tsx',
  'src/app/streams/page.tsx',
  'src/app/users/[userId]/page.tsx',
  'src/components/streaming/ChatBox.tsx',
  'src/components/streaming/StreamInteractions.tsx'
];

// Function to read a file
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

// Function to write a file
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error.message);
    return false;
  }
}

// Function to fix imports in a file
function fixImports(filePath) {
  console.log(`Processing ${filePath}...`);
  
  const content = readFile(filePath);
  if (!content) return false;
  
  // Check for various forms of NextAuth imports
  const hasNextAuthImport = 
    content.includes('next-auth/react') || 
    content.includes('from "next-auth') || 
    content.includes('from \'next-auth') ||
    content.includes('require("next-auth') ||
    content.includes('require(\'next-auth');
  
  // Check for useSession without explicit import source
  const hasUseSessionCall = content.includes('useSession(') || 
                           content.includes('useSession }') ||
                           content.includes('useSession,');
  
  if (!hasNextAuthImport && !hasUseSessionCall) {
    // If no direct import or references are found, check for other NextAuth function references
    const hasNextAuthReferences = 
      content.includes('signIn(') || 
      content.includes('signOut(');
    
    if (!hasNextAuthReferences) {
      console.log(`No NextAuth imports or references found in ${filePath}`);
      return true;
    }
  }
  
  console.log(`Found NextAuth references in ${filePath}, fixing...`);
  
  // Create a backup of the original file
  const backupPath = `${filePath}.bak`;
  writeFile(backupPath, content);
  console.log(`Created backup at ${backupPath}`);
  
  // Replace imports - multiple patterns to catch different import styles
  let fixedContent = content;
  
  // Replace various import patterns for NextAuth
  fixedContent = fixedContent.replace(/import\s+.*\s+from\s+['"]next-auth\/react['"].*?;?\n?/g, '');
  fixedContent = fixedContent.replace(/import\s+.*\s+from\s+['"]next-auth['"].*?;?\n?/g, '');
  fixedContent = fixedContent.replace(/const\s+.*\s+=\s+require\(['"]next-auth\/react['"]\).*?;?\n?/g, '');
  fixedContent = fixedContent.replace(/const\s+.*\s+=\s+require\(['"]next-auth['"]\).*?;?\n?/g, '');
  
  // Modify the imports for useSession based on the current imports
  if (hasUseSessionCall) {
    // Check for existing imports
    const hasSupabaseSessionImport = fixedContent.includes("useSupabaseSession");
    
    if (hasSupabaseSessionImport) {
      // If it already imports useSupabaseSession, add useSession to the import
      fixedContent = fixedContent.replace(
        /import\s+{\s*(.*)useSupabaseSession(.*)\s*}\s*from\s+['"]@\/hooks\/use-supabase-session['"]/,
        (match, before, after) => {
          // Check if useSession is already in the import
          if (!match.includes('useSession')) {
            return `import { ${before}useSupabaseSession${after ? after : ''}, useSession } from '@/hooks/use-supabase-session'`;
          }
          return match; // No change needed if useSession is already there
        }
      );
      console.log(`Updated existing import to include useSession`);
    } else {
      // Add a new import for useSession
      const importStatement = "import { useSession } from '@/hooks/use-supabase-session';\n";
      
      // Find a good place to insert the import - after existing imports
      const importSection = fixedContent.match(/^import.*\n(?:import.*\n)*/m);
      if (importSection) {
        const insertPosition = importSection[0].length;
        fixedContent = 
          fixedContent.substring(0, insertPosition) + 
          importStatement + 
          fixedContent.substring(insertPosition);
        console.log(`Added new import for useSession`);
      } else {
        // If no import section found, add at the beginning after use client
        if (fixedContent.startsWith("'use client'")) {
          const clientDirectiveEndIndex = fixedContent.indexOf("'use client'") + 12;
          const nextLineIndex = fixedContent.indexOf('\n', clientDirectiveEndIndex) + 1;
          fixedContent = 
            fixedContent.substring(0, nextLineIndex) + 
            importStatement + 
            fixedContent.substring(nextLineIndex);
        } else {
          // Add at the very beginning if no use client
          fixedContent = importStatement + fixedContent;
        }
        console.log(`Added import for useSession after use client`);
      }
    }
  }
  
  // Write the fixed content back to the file
  if (writeFile(filePath, fixedContent)) {
    console.log(`✅ Successfully fixed imports in ${filePath}`);
    return true;
  }
  
  return false;
}

// Main function to process all files
function main() {
  console.log('🔍 Fixing NextAuth imports...');
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const file of filesToFix) {
    if (fixImports(file)) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully processed ${successCount} files`);
  
  if (failureCount > 0) {
    console.log(`❌ Failed to process ${failureCount} files`);
    process.exit(1);
  }
  
  console.log('🎉 All NextAuth imports have been fixed!');
}

// Run the main function
main(); 