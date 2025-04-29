#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name using ESM-compatible approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Define the pattern for Prisma imports we want to replace
const PRISMA_IMPORT_PATTERN = /import\s+\{\s*prisma\s*\}\s+from\s+['"]@\/lib\/prisma['"];?/g;
const PRISMA_CLIENT_IMPORT_PATTERN = /import\s+\{\s*PrismaClient\s*\}\s+from\s+['"]@prisma\/client['"];?/g;

// Define the replacement import for Supabase
const SUPABASE_SERVER_IMPORT = 'import { createClient } from \'@/utils/supabase/server\';';

// Define an array of key API routes to focus on first
const keyRoutes = [
  'src/app/api/streams',
  'src/app/api/users',
  'src/app/api/user',
  'src/app/api/videos',
  'src/app/api/collection',
];

// Regex to match Prisma database operations
const PRISMA_OPERATION_PATTERNS = [
  { 
    pattern: /const\s+(\w+)\s+=\s+await\s+prisma\.(\w+)\.findUnique\(\s*\{\s*where:\s*\{([^}]+)\}\s*\}\s*\);/g,
    replacement: (match, varName, table, whereClause) => 
      `const { data: ${varName}, error: ${varName}Error } = await supabase\n` +
      `  .from('${capitalizeFirstLetter(table)}')\n` +
      `  .select('*')\n` +
      processPrismaWhereClause(whereClause) +
      `  .single();`
  },
  {
    pattern: /const\s+(\w+)\s+=\s+await\s+prisma\.(\w+)\.findFirst\(\s*\{\s*where:\s*\{([^}]+)\}\s*\}\s*\);/g,
    replacement: (match, varName, table, whereClause) => 
      `const { data: ${varName}, error: ${varName}Error } = await supabase\n` +
      `  .from('${capitalizeFirstLetter(table)}')\n` +
      `  .select('*')\n` +
      processPrismaWhereClause(whereClause) +
      `  .single();`
  },
  {
    pattern: /const\s+(\w+)\s+=\s+await\s+prisma\.(\w+)\.findMany\(\s*\{\s*([^}]*)\}\s*\);/g,
    replacement: (match, varName, table, options) => 
      `const { data: ${varName}, error: ${varName}Error } = await supabase\n` +
      `  .from('${capitalizeFirstLetter(table)}')\n` +
      `  .select('*')\n` +
      processPrismaOptions(options) +
      `;`
  },
  {
    pattern: /await\s+prisma\.(\w+)\.create\(\s*\{\s*data:\s*\{([^}]+)\}\s*\}\s*\);/g,
    replacement: (match, table, dataClause) => 
      `const { error: createError } = await supabase\n` +
      `  .from('${capitalizeFirstLetter(table)}')\n` +
      `  .insert({\n    ${dataClause.trim()}\n  });\n\n` +
      `if (createError) {\n  throw createError;\n}`
  },
  {
    pattern: /const\s+(\w+)\s+=\s+await\s+prisma\.(\w+)\.create\(\s*\{\s*data:\s*\{([^}]+)\}(?:,\s*select:\s*\{([^}]+)\})?\s*\}\s*\);/g,
    replacement: (match, varName, table, dataClause, selectClause) => {
      const selectFields = selectClause ? 
        extractSelectFields(selectClause) : 
        '*';
      
      return `const { data: ${varName}, error: ${varName}Error } = await supabase\n` +
      `  .from('${capitalizeFirstLetter(table)}')\n` +
      `  .insert({\n    ${dataClause.trim()}\n  })\n` +
      `  .select('${selectFields}')\n` +
      `  .single();\n\n` +
      `if (${varName}Error) {\n  throw ${varName}Error;\n}`;
    }
  },
  {
    pattern: /await\s+prisma\.(\w+)\.update\(\s*\{\s*where:\s*\{([^}]+)\},\s*data:\s*\{([^}]+)\}\s*\}\s*\);/g,
    replacement: (match, table, whereClause, dataClause) => 
      `const { error: updateError } = await supabase\n` +
      `  .from('${capitalizeFirstLetter(table)}')\n` +
      `  .update({\n    ${dataClause.trim()}\n  })\n` +
      processPrismaWhereClause(whereClause) +
      `;\n\n` +
      `if (updateError) {\n  throw updateError;\n}`
  },
  {
    pattern: /const\s+(\w+)\s+=\s+await\s+prisma\.(\w+)\.update\(\s*\{\s*where:\s*\{([^}]+)\},\s*data:\s*\{([^}]+)\}(?:,\s*select:\s*\{([^}]+)\})?\s*\}\s*\);/g,
    replacement: (match, varName, table, whereClause, dataClause, selectClause) => {
      const selectFields = selectClause ? 
        extractSelectFields(selectClause) : 
        '*';
      
      return `const { data: ${varName}, error: ${varName}Error } = await supabase\n` +
      `  .from('${capitalizeFirstLetter(table)}')\n` +
      `  .update({\n    ${dataClause.trim()}\n  })\n` +
      processPrismaWhereClause(whereClause) +
      `  .select('${selectFields}')\n` +
      `  .single();\n\n` +
      `if (${varName}Error) {\n  throw ${varName}Error;\n}`;
    }
  },
  {
    pattern: /await\s+prisma\.(\w+)\.delete\(\s*\{\s*where:\s*\{([^}]+)\}\s*\}\s*\);/g,
    replacement: (match, table, whereClause) => 
      `const { error: deleteError } = await supabase\n` +
      `  .from('${capitalizeFirstLetter(table)}')\n` +
      `  .delete()\n` +
      processPrismaWhereClause(whereClause) +
      `;\n\n` +
      `if (deleteError) {\n  throw deleteError;\n}`
  },
  {
    pattern: /const\s+(\w+)\s+=\s+await\s+prisma\.(\w+)\.count\(\s*(?:\{\s*where:\s*\{([^}]+)\}\s*\})?\s*\);/g,
    replacement: (match, varName, table, whereClause) => {
      const whereCode = whereClause ? 
        processPrismaWhereClause(whereClause) : 
        '';
      
      return `const { count, error: countError } = await supabase\n` +
      `  .from('${capitalizeFirstLetter(table)}')\n` +
      `  .select('id', { count: 'exact', head: true })\n` +
      whereCode +
      `;\n\n` +
      `if (countError) {\n  throw countError;\n}\n\n` +
      `const ${varName} = count || 0;`;
    }
  },
  // More complex pattern for raw SQL queries
  {
    pattern: /const\s+(\w+)\s+=\s+await\s+prisma\.\$queryRaw`([^`]+)`;/g,
    replacement: (match, varName, query) => 
      `// NOTE: Converted from Prisma raw query - may need manual adjustment\n` +
      `const { data: ${varName}, error: ${varName}Error } = await supabase\n` +
      `  .rpc('query_${varName.toLowerCase()}', { /* params may be needed */ });\n\n` +
      `// Original query: ${query.replace(/\n/g, ' ').trim()}\n\n` +
      `if (${varName}Error) {\n  throw ${varName}Error;\n}`
  }
];

// Utility function to capitalize the first letter (for table names)
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Extract select fields from Prisma select clause
function extractSelectFields(selectClause) {
  const fields = selectClause
    .split(',')
    .map(field => field.trim().split(':')[0].trim())
    .join(', ');
  
  return fields || '*';
}

// Process Prisma where clauses to Supabase format
function processPrismaWhereClause(whereClause) {
  const lines = whereClause.split(',').map(line => line.trim());
  let result = '';
  
  for (const line of lines) {
    if (!line) continue;
    
    // Try to handle more complex where clauses
    if (line.includes('contains')) {
      const parts = line.split(':');
      const field = parts[0].trim();
      const value = parts[1].trim().replace(/contains:\s*/, '');
      result += `  .ilike('${field}', '%' + ${value} + '%')\n`;
    } else if (line.includes('startsWith')) {
      const parts = line.split(':');
      const field = parts[0].trim();
      const value = parts[1].trim().replace(/startsWith:\s*/, '');
      result += `  .ilike('${field}', ${value} + '%')\n`;
    } else if (line.includes('endsWith')) {
      const parts = line.split(':');
      const field = parts[0].trim();
      const value = parts[1].trim().replace(/endsWith:\s*/, '');
      result += `  .ilike('${field}', '%' + ${value})\n`;
    } else if (line.includes('in:')) {
      const parts = line.split(':');
      const field = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      result += `  .in('${field}', ${value})\n`;
    } else if (line.includes('not:')) {
      const parts = line.split(':');
      const field = parts[0].trim();
      const value = parts.slice(1).join(':').replace(/not:\s*/, '').trim();
      result += `  .neq('${field}', ${value})\n`;
    } else if (line.includes('gt:')) {
      const parts = line.split(':');
      const field = parts[0].trim();
      const value = parts.slice(1).join(':').replace(/gt:\s*/, '').trim();
      result += `  .gt('${field}', ${value})\n`;
    } else if (line.includes('gte:')) {
      const parts = line.split(':');
      const field = parts[0].trim();
      const value = parts.slice(1).join(':').replace(/gte:\s*/, '').trim();
      result += `  .gte('${field}', ${value})\n`;
    } else if (line.includes('lt:')) {
      const parts = line.split(':');
      const field = parts[0].trim();
      const value = parts.slice(1).join(':').replace(/lt:\s*/, '').trim();
      result += `  .lt('${field}', ${value})\n`;
    } else if (line.includes('lte:')) {
      const parts = line.split(':');
      const field = parts[0].trim();
      const value = parts.slice(1).join(':').replace(/lte:\s*/, '').trim();
      result += `  .lte('${field}', ${value})\n`;
    } else {
      // Simple equality
      const parts = line.split(':').map(part => part.trim());
      if (parts.length >= 2) {
        const key = parts[0];
        const value = parts.slice(1).join(':').trim();
        result += `  .eq('${key}', ${value})\n`;
      }
    }
  }
  
  return result;
}

// Process Prisma query options (include, orderBy, etc.)
function processPrismaOptions(options) {
  let result = '';
  
  // Handle include clauses
  if (options.includes('include')) {
    const includeMatch = options.match(/include:\s*{([^}]+)}/);
    if (includeMatch && includeMatch[1]) {
      const relations = includeMatch[1]
        .split(',')
        .map(rel => rel.trim().split(':')[0].trim())
        .filter(rel => rel && rel !== 'true' && rel !== 'false')
        .join(', ');
      
      if (relations) {
        result += `  .select('*, ${relations}(*)')\n`;
      }
    }
  }
  
  // Handle orderBy clauses
  if (options.includes('orderBy')) {
    const orderByMatch = options.match(/orderBy:\s*{\s*([^}]+)\s*}/);
    if (orderByMatch && orderByMatch[1]) {
      const orderParts = orderByMatch[1].split(':').map(part => part.trim());
      if (orderParts.length >= 2) {
        const field = orderParts[0];
        const direction = orderParts[1].includes('desc') ? 
          '{ ascending: false }' : 
          '{ ascending: true }';
        result += `  .order('${field}', ${direction})\n`;
      }
    }
  }
  
  // Handle take/limit
  if (options.includes('take')) {
    const takeMatch = options.match(/take:\s*(\d+)/);
    if (takeMatch && takeMatch[1]) {
      result += `  .limit(${takeMatch[1]})\n`;
    }
  }
  
  // Handle skip/offset
  if (options.includes('skip')) {
    const skipMatch = options.match(/skip:\s*(\d+)/);
    if (skipMatch && skipMatch[1]) {
      result += `  .offset(${skipMatch[1]})\n`;
    }
  }
  
  return result;
}

async function findFiles(dir, pattern, fileList = []) {
  try {
    const files = await fs.readdir(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .next directory
        if (file !== 'node_modules' && file !== '.next') {
          await findFiles(filePath, pattern, fileList);
        }
      } else if (pattern.test(file)) {
        fileList.push(filePath);
      }
    }
    
    return fileList;
  } catch (error) {
    console.error(`Error accessing directory ${dir}:`, error.message);
    return fileList; // Return what we have so far
  }
}

async function updateFile(filePath) {
  try {
    // Read the file content
    let content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;

    // Create a backup of the original file
    const backupPath = `${filePath}.bak`;
    await fs.writeFile(backupPath, content);

    // Replace Prisma imports with Supabase imports
    const hasPrismaImport = PRISMA_IMPORT_PATTERN.test(content);
    
    if (hasPrismaImport) {
      console.log(`Found Prisma import in ${filePath}`);
      
      // Replace Prisma imports
      content = content.replace(PRISMA_IMPORT_PATTERN, SUPABASE_SERVER_IMPORT);
      
      // Remove PrismaClient import if it exists
      content = content.replace(PRISMA_CLIENT_IMPORT_PATTERN, '');
      
      // Add supabase client initialization if not present
      if (!content.includes('const supabase = await createClient()')) {
        // Look for the function declaration pattern
        content = content.replace(
          /(export async function\s+\w+\s*\([^)]*\)\s*\{)([\s\S]*?)(?=const\s+\w+\s+=\s+await\s+prisma|await\s+prisma|return\s|if\s*\(|try\s*\{)/g, 
          (match, funcDecl, code) => {
            // Don't add if the code already has supabase client
            if (code.includes('createClient()')) return match;
            
            return `${funcDecl}\n  const supabase = await createClient();\n${code}`;
          }
        );
      }
      
      // Replace Prisma operations with Supabase equivalents
      for (const { pattern, replacement } of PRISMA_OPERATION_PATTERNS) {
        content = content.replace(pattern, replacement);
      }
      
      // Write the updated content back to the file
      await fs.writeFile(filePath, content);
      
      if (content !== originalContent) {
        console.log(`✅ Updated ${filePath}`);
        return true;
      } else {
        console.log(`⚠️ No changes needed in ${filePath} (already converted?)`);
        return false;
      }
    } else {
      console.log(`ℹ️ No Prisma imports found in ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error);
    return false;
  }
}

async function main() {
  console.log('🔍 Scanning for files with Prisma imports...');
  
  let filesToProcess = [];
  
  // First focus on key API routes
  for (const routePath of keyRoutes) {
    const routeDir = path.join(rootDir, routePath);
    try {
      const files = await findFiles(routeDir, /\.(tsx?|jsx?)$/);
      filesToProcess.push(...files);
    } catch (error) {
      console.warn(`⚠️ Could not process ${routePath}:`, error.message);
    }
  }
  
  // Process all found files
  console.log(`Found ${filesToProcess.length} potential files to check.`);
  
  let updatedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  for (const filePath of filesToProcess) {
    try {
      const wasUpdated = await updateFile(filePath);
      if (wasUpdated) updatedCount++;
      else skippedCount++;
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`✅ Successfully processed ${filesToProcess.length} files`);
  console.log(`🔄 Updated ${updatedCount} files with Prisma imports`);
  console.log(`⏭️ Skipped ${skippedCount} files (no Prisma imports or already converted)`);
  console.log(`❌ Encountered errors in ${errorCount} files`);
  console.log(`\n🎉 Migration script completed!`);
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 