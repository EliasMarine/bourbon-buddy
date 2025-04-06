import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();
const DB_PATH = path.join(process.cwd(), 'prisma/dev.db');
const BACKUP_DIR = path.join(process.cwd(), 'database-backups');

async function checkDatabase() {
  console.log('🔍 Checking database integrity...');
  
  // Check if the database file exists
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found!');
    return false;
  }
  
  try {
    // Test database connection
    await prisma.$connect();
    
    // Check user table to ensure database is usable
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in the database`);
    
    if (userCount === 0) {
      console.warn('⚠️ No users found in the database. Consider running the seed script.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    return false;
  }
}

async function createBackup() {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`📁 Created backup directory at ${BACKUP_DIR}`);
    }
    
    // Generate backup filename with timestamp
    const date = new Date();
    const timestamp = date.toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    // Copy the database file
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`💾 Database backed up to ${backupFileName}`);
    
    // Clean up old backups (keep only 10 most recent)
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        ctime: fs.statSync(path.join(BACKUP_DIR, file)).ctime.getTime()
      }))
      .sort((a, b) => b.ctime - a.ctime); // newest first
    
    const MAX_BACKUPS = 10;
    if (files.length > MAX_BACKUPS) {
      const filesToRemove = files.slice(MAX_BACKUPS);
      for (const file of filesToRemove) {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Removed old backup: ${file.name}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    return false;
  }
}

async function seedIfNeeded() {
  try {
    // Check if we need to seed the database
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      console.log('🌱 No users found. Seeding the database...');
      
      try {
        execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit' });
        console.log('✅ Database seeded successfully');
        return true;
      } catch (error) {
        console.error('❌ Error seeding database:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking if seeding is needed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Running pre-startup checks...');
  
  // Step 1: Check database
  const dbOk = await checkDatabase();
  
  // Step 2: Create backup
  if (dbOk) {
    await createBackup();
  } else {
    console.log('⚠️ Database check failed, skipping backup');
    
    // Try to find and restore the most recent backup
    try {
      const backups = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(BACKUP_DIR, file),
          ctime: fs.statSync(path.join(BACKUP_DIR, file)).ctime.getTime()
        }))
        .sort((a, b) => b.ctime - a.ctime); // newest first
      
      if (backups.length > 0) {
        console.log(`🔄 Attempting to restore from last backup: ${backups[0].name}`);
        fs.copyFileSync(backups[0].path, DB_PATH);
        console.log('✅ Database restored from backup');
      } else {
        console.error('❌ No backups found. Will attempt to seed database.');
      }
    } catch (error) {
      console.error('❌ Error restoring from backup:', error);
    }
  }
  
  // Step 3: Seed database if needed
  await seedIfNeeded();
  
  console.log('✅ Pre-startup checks completed');
}

main()
  .catch((e) => {
    console.error('❌ Pre-startup checks failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 