#!/usr/bin/env node

/**
 * This script removes Prisma dependencies and folders from the project 
 * after migrating to Supabase.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Paths to clean
const PATHS_TO_REMOVE = [
  './prisma',
  './src/lib/prisma.ts',
  './src/lib/prisma-fix.ts',
  './src/lib/prisma-transaction-fix.ts',
];

// Files that may need manual processing (they've been converted but not deleted)
const FILES_TO_CHECK = [
  './src/app/api/verify/route.ts',
  './src/app/api/streams/route.ts',
  // Add other converted files here
];

// Backup directory
const BACKUP_DIR = './backup/prisma-backup-' + new Date().toISOString().replace(/[:.]/g, '-');

// Check for Prisma in package.json
function checkPackageJson() {
  console.log('Checking package.json for Prisma dependencies...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json not found!');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};
  
  const hasPrismaDeps = dependencies['@prisma/client'] || devDependencies.prisma;
  
  if (hasPrismaDeps) {
    console.log('⚠️ Found Prisma dependencies:');
    if (dependencies['@prisma/client']) {
      console.log(`- @prisma/client: ${dependencies['@prisma/client']}`);
    }
    if (devDependencies.prisma) {
      console.log(`- prisma: ${devDependencies.prisma}`);
    }
    return true;
  } else {
    console.log('✅ No Prisma dependencies found in package.json');
    return false;
  }
}

// Backup a directory or file
function backup(itemPath) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const targetPath = path.join(BACKUP_DIR, path.basename(itemPath));
    
    if (fs.existsSync(itemPath)) {
      if (fs.lstatSync(itemPath).isDirectory()) {
        fs.cpSync(itemPath, targetPath, { recursive: true });
      } else {
        fs.copyFileSync(itemPath, targetPath);
      }
      console.log(`✅ Backed up ${itemPath} to ${targetPath}`);
    }
  } catch (error) {
    console.error(`❌ Error backing up ${itemPath}:`, error);
  }
}

// Remove Prisma dependencies
function removePrismaDependencies() {
  try {
    console.log('Removing Prisma dependencies...');
    execSync('npm uninstall @prisma/client prisma', { stdio: 'inherit' });
    console.log('✅ Prisma dependencies removed');
  } catch (error) {
    console.error('❌ Error removing Prisma dependencies:', error);
  }
}

// Remove Prisma directories and files
function removeFiles() {
  console.log('Removing Prisma files and directories...');
  
  for (const itemPath of PATHS_TO_REMOVE) {
    const fullPath = path.join(process.cwd(), itemPath);
    
    if (fs.existsSync(fullPath)) {
      backup(fullPath);
      
      try {
        if (fs.lstatSync(fullPath).isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
        console.log(`✅ Removed ${itemPath}`);
      } catch (error) {
        console.error(`❌ Error removing ${itemPath}:`, error);
      }
    } else {
      console.log(`⚠️ ${itemPath} not found, skipping`);
    }
  }
}

// Check files that have been converted but not deleted
function checkConvertedFiles() {
  console.log('\nThe following files have been converted to use Supabase but not deleted:');
  
  for (const filePath of FILES_TO_CHECK) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (fs.existsSync(fullPath)) {
      console.log(`- ${filePath}`);
    }
  }
  
  console.log('\nPlease review these files manually to ensure they are working correctly with Supabase.');
}

// Find remaining Prisma references
function findRemainingReferences() {
  console.log('\nChecking for remaining Prisma references...');
  
  try {
    const grepCommand = process.platform === 'win32' 
      ? 'findstr /s /i "prisma" .\\src\\**\\*.ts .\\src\\**\\*.tsx .\\app\\**\\*.ts .\\app\\**\\*.tsx'
      : 'grep -r --include="*.ts" --include="*.tsx" "prisma" ./src ./app 2>/dev/null || true';
    
    const result = execSync(grepCommand, { encoding: 'utf8' });
    
    if (result.trim()) {
      console.log('⚠️ Found remaining Prisma references:');
      console.log(result);
      console.log('\nPlease check these references manually and convert them to Supabase.');
    } else {
      console.log('✅ No remaining Prisma references found in source files');
    }
  } catch (error) {
    // Grep may return non-zero if no matches are found
    if (error.status !== 1) {
      console.error('❌ Error finding remaining references:', error);
    } else {
      console.log('✅ No remaining Prisma references found in source files');
    }
  }
}

// Main function
function main() {
  console.log('🧹 Prisma Cleanup Tool 🧹');
  console.log('This script will remove Prisma dependencies and files from your project.');
  console.log('All removed files will be backed up to:', BACKUP_DIR);
  console.log('\n⚠️  This operation cannot be undone automatically! ⚠️\n');
  
  rl.question('Do you want to continue? (y/N) ', (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('Operation cancelled by user');
      rl.close();
      return;
    }
    
    const hasPrismaDeps = checkPackageJson();
    
    if (hasPrismaDeps) {
      rl.question('\nWould you like to remove the Prisma dependencies? (y/N) ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          removePrismaDependencies();
        } else {
          console.log('Skipping dependency removal');
        }
        
        continueWithFileDeletion();
      });
    } else {
      continueWithFileDeletion();
    }
  });
}

function continueWithFileDeletion() {
  rl.question('\nWould you like to remove Prisma files and directories? (y/N) ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      removeFiles();
    } else {
      console.log('Skipping file removal');
    }
    
    // Final checks
    checkConvertedFiles();
    findRemainingReferences();
    
    console.log('\n✅ Prisma cleanup complete!');
    console.log('Please run your tests to ensure everything is working correctly with Supabase.');
    rl.close();
  });
}

// Run the main function
main(); 