import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';

const prisma = new PrismaClient();
const DB_PATH = path.join(process.cwd(), 'prisma/dev.db');
const BACKUP_DIR = path.join(process.cwd(), 'database-backups');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function promptForConfirmation(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function backupDatabase() {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`📁 Created backup directory at ${BACKUP_DIR}`);
    }
    
    // Generate backup filename with timestamp
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-');
    const backupFileName = `pre-migration-${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    // Copy the database file
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`💾 Database backed up to ${backupFileName}`);
    
    return backupPath;
  } catch (error) {
    console.error('❌ Error backing up database:', error);
    throw error;
  }
}

async function runMigration() {
  try {
    console.log('🔄 Running Prisma migration...');
    
    // Generate migration
    execSync('npx prisma migrate dev', { stdio: 'inherit' });
    
    console.log('✅ Migration completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

async function verifyDatabaseAfterMigration() {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Verify user table
    const userCount = await prisma.user.count();
    console.log(`📊 Users table has ${userCount} records after migration`);
    
    return true;
  } catch (error) {
    console.error('❌ Error verifying database after migration:', error);
    return false;
  }
}

async function restoreFromBackup(backupPath: string) {
  try {
    console.log(`🔄 Restoring database from backup: ${path.basename(backupPath)}`);
    
    fs.copyFileSync(backupPath, DB_PATH);
    
    console.log('✅ Database restored successfully');
    return true;
  } catch (error) {
    console.error('❌ Error restoring database:', error);
    return false;
  }
}

async function main() {
  console.log('Safe Database Migration Utility');
  console.log('------------------------------');
  
  // Warn the user and require confirmation
  console.log('⚠️ This utility will:');
  console.log('  1. Back up your current database');
  console.log('  2. Run Prisma migrations');
  console.log('  3. Verify the database is still accessible after migration');
  console.log('  4. Restore from backup automatically if verification fails');
  
  const confirmed = await promptForConfirmation('Do you want to proceed with the migration?');
  
  if (!confirmed) {
    console.log('Migration cancelled.');
    process.exit(0);
  }
  
  try {
    // Step 1: Backup the database
    console.log('Step 1: Backing up the database...');
    const backupPath = await backupDatabase();
    
    // Step 2: Run the migration
    console.log('Step 2: Running migration...');
    const migrationSuccess = await runMigration();
    
    if (!migrationSuccess) {
      console.error('❌ Migration command failed');
      
      const restoreConfirmed = await promptForConfirmation('Would you like to restore from the backup?');
      
      if (restoreConfirmed) {
        await restoreFromBackup(backupPath);
      }
      
      process.exit(1);
    }
    
    // Step 3: Verify the database
    console.log('Step 3: Verifying database...');
    const verificationSuccess = await verifyDatabaseAfterMigration();
    
    if (!verificationSuccess) {
      console.error('❌ Database verification failed after migration');
      
      const restoreConfirmed = await promptForConfirmation('Would you like to restore from the backup?');
      
      if (restoreConfirmed) {
        await restoreFromBackup(backupPath);
      }
      
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully and database verified');
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main(); 