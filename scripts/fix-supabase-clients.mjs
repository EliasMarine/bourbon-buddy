#!/usr/bin/env node

/**
 * Script to update Supabase client imports to use the correct client based on context
 * 
 * This script:
 * 1. Identifies files in the app directory using createAppRouterSupabaseClient
 * 2. Updates their imports to use the new dedicated file
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

console.log(`${colors.cyan}🔍 Updating Supabase client imports...${colors.reset}`);

// Pattern to find files in app directory that might use Supabase
const filePattern = path.join(rootDir, 'src/app/**/*.{ts,tsx,js,jsx}');
const files = globSync(filePattern);

// If file is in the src/app directory and is a server component, 
// it should use the app router client
function isLikelyServerComponent(filePath) {
  // Skip files marked with 'use client'
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes("'use client'") || content.includes('"use client"')) {
    return false;
  }
  
  // Files in app directory not marked with 'use client' are server components
  return true;
}

// Create backup and fix files
for (const file of files) {
  scannedFiles++;
  
  try {
    // Skip Supabase implementation files
    if (file.includes('supabase.ts') || file.includes('supabase.js') || 
        file.includes('supabase-app-router.ts')) {
      console.log(`${colors.yellow}ℹ️ Skipping Supabase module: ${file}${colors.reset}`);
      skippedFiles++;
      continue;
    }
    
    // Read file content
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;
    
    // Check if this file imports from @/lib/supabase
    const importsFromSupabase = content.includes('from "@/lib/supabase"') || 
                               content.includes("from '@/lib/supabase'");
    
    // Check if file uses or imports createServerSupabaseClient, createAppRouterSupabaseClient
    const usesAppRouterClient = content.includes('createAppRouterSupabaseClient');
    const usesServerClient = content.includes('createServerSupabaseClient');
    
    // Check if this is a server component in app directory
    const isServerComponent = isLikelyServerComponent(file);
    
    // Only process files that have Supabase imports and meet our criteria
    if (importsFromSupabase && (usesAppRouterClient || (isServerComponent && usesServerClient))) {
      console.log(`${colors.yellow}Found Supabase usage in ${file}${colors.reset}`);
      console.log(`${colors.blue}Is server component: ${isServerComponent}${colors.reset}`);
      
      // Create backup of original file
      const backupFile = `${file}.bak`;
      fs.writeFileSync(backupFile, content);
      console.log(`${colors.blue}Created backup at ${backupFile}${colors.reset}`);
      
      // For server components that use createServerSupabaseClient or createAppRouterSupabaseClient,
      // update to use createAppRouterSupabaseClient from the new file
      if (isServerComponent) {
        // Add import for createAppRouterSupabaseClient from the new file
        if (!content.includes('from "@/lib/supabase-app-router"') && 
            !content.includes("from '@/lib/supabase-app-router'")) {
          // Add the new import
          content = `import { createAppRouterSupabaseClient } from '@/lib/supabase-app-router';\n${content}`;
        }
        
        // Replace createServerSupabaseClient with createAppRouterSupabaseClient
        content = content.replace(
          /createServerSupabaseClient\s*\(\s*\)/g,
          'createAppRouterSupabaseClient()'
        );
        
        // Remove createServerSupabaseClient from imports
        content = content.replace(
          /import\s+\{([^}]*),\s*createServerSupabaseClient\s*([^}]*)\}\s+from\s+(['"])@\/lib\/supabase\3/g,
          'import {$1$2} from $3@/lib/supabase$3'
        );
        
        // Also handle case where it's the only import
        content = content.replace(
          /import\s+\{\s*createServerSupabaseClient\s*\}\s+from\s+(['"])@\/lib\/supabase\1/g,
          ''
        );
      }
      
      // If changes were made, save the file
      if (content !== originalContent) {
        fs.writeFileSync(file, content);
        console.log(`${colors.green}✅ Updated Supabase client in ${file}${colors.reset}`);
        updatedFiles++;
      } else {
        console.log(`${colors.yellow}ℹ️ No changes needed in ${file}${colors.reset}`);
        skippedFiles++;
      }
    } else {
      skippedFiles++;
    }
  } catch (err) {
    console.error(`${colors.red}❌ Error processing file ${file}:${colors.reset}`, err);
    errorFiles++;
  }
}

console.log('\n');
console.log(`${colors.cyan}📊 Summary:${colors.reset}`);
console.log(`${colors.green}✅ Successfully processed ${scannedFiles} files${colors.reset}`);
console.log(`${colors.green}🔄 Updated ${updatedFiles} files with correct Supabase client imports${colors.reset}`);
console.log(`${colors.yellow}⏭️ Skipped ${skippedFiles} files (no issues found)${colors.reset}`);
console.log(`${colors.red}❌ Encountered errors in ${errorFiles} files${colors.reset}`);
console.log('\n');
console.log(`${colors.green}🎉 Supabase client updates complete!${colors.reset}`); 