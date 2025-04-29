#!/usr/bin/env node

/**
 * This script fixes files that still import from @/lib/prisma
 * and converts them to use the Supabase client instead
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Error files from the build log
const errorFiles = [
  'src/app/admin/security/csrf-monitoring/page.tsx',
  'src/app/api/collection/route.ts',
  'src/app/api/streams/[id]/interactions/route.ts',
  'src/app/api/streams/[id]/like/route.ts',
  'src/app/api/streams/[id]/report/route.ts'
];

// Find additional files with Prisma imports
function findPrismaImportFiles() {
  try {
    const result = execSync('grep -r --include="*.ts" --include="*.tsx" "import.*from.*\'@/lib/prisma\'" src/')
      .toString()
      .trim()
      .split('\n')
      .map(line => line.split(':')[0])
      .filter(Boolean);
    
    return [...new Set([...errorFiles, ...result])];
  } catch (error) {
    console.error('Error finding Prisma import files:', error.message);
    return errorFiles;
  }
}

function createBackup(filePath) {
  try {
    const backupPath = `${filePath}.bak`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`Created backup at ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`Error creating backup for ${filePath}:`, error.message);
    return false;
  }
}

function fixPrismaImports(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if the file doesn't have a Prisma import
    if (!content.includes('import') || !content.includes('@/lib/prisma')) {
      console.log(`No Prisma imports found in ${filePath}`);
      return false;
    }

    // Create a backup
    if (!createBackup(filePath)) {
      return false;
    }

    // Replace Prisma import with Supabase import
    content = content.replace(
      /import\s+{\s*prisma\s*}\s+from\s+['"]@\/lib\/prisma['"]/g,
      "import supabase, { createServerSupabaseClient } from '@/lib/supabase'"
    );

    // Replace Prisma queries with Supabase equivalents
    // This is a basic transformation and might need manual fixes later
    
    // 1. Replace User queries
    content = content.replace(
      /prisma\.user\.findUnique\(\s*{\s*where:\s*{\s*(?:id|email):\s*([^}]+)\s*}\s*}\s*\)/g,
      "supabase.from('User').select('*').eq('$1', $1).single()"
    );
    
    // 2. Replace security event queries
    content = content.replace(
      /prisma\.securityEvent\.(count|findMany)\(([^)]*)\)/g,
      "supabase.from('SecurityEvent').$1($2)"
    );
    
    // 3. Replace basic count queries
    content = content.replace(
      /prisma\.(\w+)\.count\(\s*{\s*where:\s*{\s*(\w+):\s*([^}]+)\s*}\s*}\s*\)/g,
      "supabase.from('$1').select('*', { count: 'exact', head: true }).eq('$2', $3)"
    );
    
    // 4. Replace basic queries
    content = content.replace(
      /prisma\.(\w+)\.findUnique\(\s*{\s*where:\s*{\s*id:\s*([^}]+)\s*}(?:,\s*select:\s*([^}]+)\s*})?\s*}\s*\)/g,
      "supabase.from('$1').select('$3' || '*').eq('id', $2).single()"
    );

    // 5. Replace multi-key findUnique
    content = content.replace(
      /prisma\.(\w+)\.findUnique\(\s*{\s*where:\s*{\s*(\w+)_(\w+):\s*{\s*(\w+):\s*([^,]+),\s*(\w+):\s*([^}]+)\s*}\s*}\s*}\s*\)/g,
      "supabase.from('$1').select('*').eq('$4', $5).eq('$6', $7).single()"
    );

    // Add a comment indicating the file was automatically converted
    content = `// Automatically converted from Prisma to Supabase by fix-prisma-imports.js\n// Manual review required!\n\n${content}`;

    // Write the modified content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Successfully converted ${filePath} from Prisma to Supabase`);
    return true;
  } catch (error) {
    console.error(`Error fixing Prisma imports in ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🔍 Finding files with Prisma imports...');
const files = findPrismaImportFiles();
console.log(`Found ${files.length} files with Prisma imports`);

let successCount = 0;
let failureCount = 0;

files.forEach(file => {
  console.log(`Processing ${file}...`);
  if (fixPrismaImports(file)) {
    successCount++;
  } else {
    failureCount++;
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Successfully processed ${successCount} files`);
console.log(`❌ Failed to process ${failureCount} files`);
console.log('\n⚠️ IMPORTANT: Review the converted files! This script performs basic conversions only.');
console.log('The conversion from Prisma to Supabase is complex and may require manual adjustments.'); 