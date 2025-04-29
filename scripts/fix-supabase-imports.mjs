#!/usr/bin/env node

/**
 * This script identifies and fixes Supabase import issues that can cause deployment failures.
 * It separates server-side imports from client-side imports to avoid next/headers conflicts.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define import patterns to look for
const SERVER_IMPORTS = [
  "import { createServerClient } from '@/lib/supabase'",
  "import { createMiddlewareClient } from '@/lib/supabase'",
  "import { createSupabaseServerClient } from '@/lib/supabase'",
  "import { supabaseAdmin } from '@/lib/supabase'",
  "import { createAdminClient } from '@/lib/supabase'",
  "import { withSupabaseAdmin } from '@/lib/supabase'"
];

const CLIENT_IMPORTS = [
  "import { createSupabaseBrowserClient } from '@/lib/supabase'",
  "import { createBrowserClient } from '@/lib/supabase'",
  "import { getStorageUrl } from '@/lib/supabase'",
  "import { isServer } from '@/lib/supabase'"
];

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Helper function to find TypeScript files recursively
function findTypeScriptFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findTypeScriptFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Check if a file is in the App Router (server component)
function isServerComponent(filePath) {
  // Files in app directory that don't have 'use client' are server components
  if (filePath.includes('/app/') && !filePath.includes('/components/')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes("'use client'") && !content.includes('"use client"')) {
      return true;
    }
  }
  
  // Files with specific server-side naming patterns
  return (
    filePath.includes('/api/') || 
    filePath.includes('middleware.ts') || 
    filePath.includes('/server/') ||
    filePath.includes('.server.ts') ||
    filePath.includes('.server.tsx')
  );
}

// Fix imports in a file
function fixImportsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;
  let hasChanges = false;
  
  // Check if it's a server component
  const isServer = isServerComponent(filePath);
  
  // Replace server imports
  if (isServer) {
    SERVER_IMPORTS.forEach(importStmt => {
      if (newContent.includes(importStmt)) {
        const newImport = importStmt.replace("'@/lib/supabase'", "'@/lib/supabase-server'");
        newContent = newContent.replace(importStmt, newImport);
        hasChanges = true;
      }
    });
  }
  
  // If there are changes, write the file
  if (hasChanges) {
    console.log(`✅ Fixed: ${filePath.replace(ROOT_DIR, '')}`);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return true;
  }
  
  return false;
}

// Main function
function main() {
  console.log('🔍 Checking for Supabase import issues...');
  
  // Find all TypeScript files
  const tsFiles = findTypeScriptFiles(SRC_DIR);
  console.log(`Found ${tsFiles.length} TypeScript files to analyze`);
  
  let fixedCount = 0;
  
  // Check each file
  tsFiles.forEach(filePath => {
    if (fixImportsInFile(filePath)) {
      fixedCount++;
    }
  });
  
  if (fixedCount > 0) {
    console.log(`\n✅ Fixed imports in ${fixedCount} files`);
    console.log('\nNext steps:');
    console.log('1. Commit your changes: git add . && git commit -m "fix: update supabase imports to fix deployment issues"');
    console.log('2. Push to deploy: git push');
  } else {
    console.log('\n✅ No issues found! Your Supabase imports look good.');
  }
}

// Execute
main(); 