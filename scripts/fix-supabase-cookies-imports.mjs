#!/usr/bin/env node

/**
 * Script to fix Supabase cookie imports in the codebase
 * 
 * This script does the following:
 * 1. Scans for files that import cookies from next/headers
 * 2. Identifies files using createServerSupabaseClient directly with cookies from next/headers
 * 3. Updates them to use createAppRouterSupabaseClient instead
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Report counters
let scannedFiles = 0;
let updatedFiles = 0;
let skippedFiles = 0;
let errorFiles = 0;

console.log(`${colors.cyan}🔍 Scanning for Supabase cookie import issues...${colors.reset}`);

// Pattern to find files that might use cookies with Supabase
const filePattern = path.join(rootDir, 'src/**/*.{ts,tsx,js,jsx}');
const files = globSync(filePattern);

// Define patterns to search for problematic imports
const cookiesImportPattern = /import\s+\{\s*(?:cookies(?:\s+as\s+\w+)?|(\w+))\s*\}\s+from\s+['"]next\/headers['"]/;
const createServerSupabaseClientPattern = /createServerSupabaseClient\s*\(\s*(?:async\s*)?\(\s*\)\s*=>/;
const nextCookiesUsagePattern = /const\s+(?:\w+)\s*=\s*(?:await\s+)?(?:cookies|nextCookies)\(\)/;

// Create backup and fix files
for (const file of files) {
  scannedFiles++;
  
  try {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    let needsUpdate = false;
    
    // Skip if this is the supabase.ts file itself (we already fixed it directly)
    if (file.includes('supabase.ts') || file.includes('supabase.js')) {
      console.log(`${colors.yellow}ℹ️ Skipping supabase module file: ${file}${colors.reset}`);
      skippedFiles++;
      continue;
    }
    
    // Check if this file has next/headers cookies import
    const hasCookiesImport = cookiesImportPattern.test(content);
    
    // Check if this file is using createServerSupabaseClient directly
    const hasServerClientUsage = createServerSupabaseClientPattern.test(content);
    
    // Check if this file is using cookies() directly
    const hasCookiesUsage = nextCookiesUsagePattern.test(content);
    
    // Only process files that have one of the patterns
    if (hasCookiesImport || hasServerClientUsage || hasCookiesUsage) {
      console.log(`${colors.yellow}Found potential issues in ${file}${colors.reset}`);
      
      // Create backup of original file
      const backupFile = `${file}.bak`;
      fs.writeFileSync(backupFile, content);
      console.log(`${colors.blue}Created backup at ${backupFile}${colors.reset}`);
      
      // Fix the imports and usage
      // 1. Add import for createAppRouterSupabaseClient if needed
      if ((hasServerClientUsage || hasCookiesUsage) && !content.includes('createAppRouterSupabaseClient')) {
        // Check if we already have a supabase import to append to
        if (content.includes('from "@/lib/supabase"') || content.includes("from '@/lib/supabase'")) {
          // Append to existing import
          content = content.replace(
            /import\s+\{([^}]*)\}\s+from\s+(['"])@\/lib\/supabase\2/,
            (match, imports) => {
              const newImports = imports.includes('createAppRouterSupabaseClient') 
                ? imports 
                : `${imports.trim()}, createAppRouterSupabaseClient`;
              return `import {${newImports}} from '@/lib/supabase'`;
            }
          );
        } else {
          // Add new import
          content = `import { createAppRouterSupabaseClient } from '@/lib/supabase';\n${content}`;
        }
        needsUpdate = true;
      }
      
      // 2. Replace createServerSupabaseClient usage in app router components
      if (hasServerClientUsage) {
        content = content.replace(
          /createServerSupabaseClient\s*\(\s*(?:async\s*)?\(\s*\)\s*=>/g,
          'createAppRouterSupabaseClient()'
        );
        needsUpdate = true;
      }
      
      // 3. Find and replace cookies() usage with createAppRouterSupabaseClient
      if (hasCookiesUsage) {
        // Replace common patterns for server component usage
        content = content.replace(
          /const\s+(\w+)\s*=\s*(?:await\s+)?(?:cookies|nextCookies)\(\)[\s\S]*?const\s+(\w+)\s*=\s*(?:await\s+)?createServerSupabaseClient\(\)/g,
          'const $2 = await createAppRouterSupabaseClient()'
        );
        
        // If we haven't matched the combined pattern, try to replace each part separately
        if (content.match(nextCookiesUsagePattern)) {
          content = content.replace(
            /const\s+(\w+)\s*=\s*(?:await\s+)?(?:cookies|nextCookies)\(\)/g,
            '// Cookies are now handled internally by createAppRouterSupabaseClient\n// const $1 = cookies();'
          );
          needsUpdate = true;
        }
      }
      
      // If changes were made, save the file
      if (content !== originalContent || needsUpdate) {
        fs.writeFileSync(file, content);
        console.log(`${colors.green}✅ Successfully fixed Supabase cookie usage in ${file}${colors.reset}`);
        updatedFiles++;
      } else {
        console.log(`${colors.yellow}ℹ️ No changes needed in ${file}${colors.reset}`);
        skippedFiles++;
      }
    }
  } catch (err) {
    console.error(`${colors.red}❌ Error processing file ${file}:${colors.reset}`, err);
    errorFiles++;
  }
}

console.log('\n');
console.log(`${colors.cyan}📊 Summary:${colors.reset}`);
console.log(`${colors.green}✅ Successfully processed ${scannedFiles} files${colors.reset}`);
console.log(`${colors.green}🔄 Updated ${updatedFiles} files with Supabase cookie import fixes${colors.reset}`);
console.log(`${colors.yellow}⏭️ Skipped ${skippedFiles} files (no issues found)${colors.reset}`);
console.log(`${colors.red}❌ Encountered errors in ${errorFiles} files${colors.reset}`);
console.log('\n');
console.log(`${colors.green}🎉 Supabase cookie import fixes complete!${colors.reset}`); 