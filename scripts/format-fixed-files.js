#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files that were fixed
const filesToFormat = [
  'src/app/profile/appearance/page.tsx',
  'src/app/profile/edit/page.tsx',
  'src/app/profile/page.tsx',
  'src/app/streams/create/page.tsx',
  'src/app/streams/page.tsx',
  'src/app/users/[userId]/page.tsx',
  'src/components/streaming/ChatBox.tsx',
  'src/components/streaming/StreamInteractions.tsx'
];

// Function to fix formatting in a file
function fixFormatting(filePath) {
  console.log(`Formatting ${filePath}...`);
  
  try {
    // Use a simple regex to improve the formatting of imports
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Fix spacing in import statements
    let fixedContent = content.replace(
      /import\s*{\s*(\w+)\s*,\s*(\w+)\s*}\s*from/g, 
      'import { $1, $2 } from'
    );
    
    // Also fix specific cases with useSupabaseSession and useSession
    fixedContent = fixedContent.replace(
      /import\s*{\s*useSupabaseSession\s*,\s*useSession\s*}\s*from/g,
      'import { useSupabaseSession, useSession } from'
    );
    
    // Save the fixed content
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    
    console.log(`✅ Successfully formatted ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error formatting ${filePath}:`, error.message);
    return false;
  }
}

// Main function to process all files
function main() {
  console.log('🔧 Fixing formatting in modified files...');
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const file of filesToFormat) {
    if (fixFormatting(file)) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully formatted ${successCount} files`);
  
  if (failureCount > 0) {
    console.log(`❌ Failed to format ${failureCount} files`);
    process.exit(1);
  } else {
    console.log('🎉 All files formatted successfully!');
  }
}

// Run the main function
main(); 