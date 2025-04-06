import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();
const DB_PATH = path.join(process.cwd(), 'prisma/dev.db');
const BACKUP_DIR = path.join(process.cwd(), 'database-backups');

async function verifyDatabaseFile() {
  // Check if the database file exists
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found!');
    return false;
  }
  
  // Check file size to ensure it's not empty
  const stats = fs.statSync(DB_PATH);
  if (stats.size < 100) { // Basic check for minimal size
    console.error('❌ Database file seems empty or corrupted (too small)');
    return false;
  }
  
  console.log('✅ Database file exists and has content');
  return true;
}

async function verifyTableData() {
  try {
    let allPass = true;
    
    // Check Users table
    const userCount = await prisma.user.count();
    if (userCount < 1) {
      console.error(`❌ Users table has insufficient data: ${userCount} records (expected at least 1)`);
      allPass = false;
    } else {
      console.log(`✅ Users table has ${userCount} records`);
    }
    
    // Check Spirits table
    const spiritCount = await prisma.spirit.count();
    console.log(`✅ Spirits table has ${spiritCount} records`);
    
    // Check Reviews table
    const reviewCount = await prisma.review.count();
    console.log(`✅ Reviews table has ${reviewCount} records`);
    
    // Check Streams table
    const streamCount = await prisma.stream.count();
    console.log(`✅ Streams table has ${streamCount} records`);
    
    return allPass;
  } catch (error) {
    console.error('❌ Error accessing database tables:', error);
    return false;
  }
}

async function backupIfNeeded() {
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Check if we should create a backup
  const backupFiles = fs.readdirSync(BACKUP_DIR).filter(file => file.endsWith('.db'));
  
  // If no backups exist, create one
  if (backupFiles.length === 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.db`);
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`✅ Created initial backup at ${backupPath}`);
  }
}

async function main() {
  console.log('Database Verification Utility');
  console.log('----------------------------');
  
  // Step 1: Verify database file exists and is not empty
  const fileOk = await verifyDatabaseFile();
  if (!fileOk) {
    console.error('Database file verification failed. Please restore from backup.');
    process.exit(1);
  }

  // Step 2: Verify tables have expected data
  const tablesOk = await verifyTableData();
  if (!tablesOk) {
    console.error('Database tables verification failed. Consider restoring from backup or running the seed script.');
    process.exit(1);
  }

  // Step 3: Create backup if none exists
  await backupIfNeeded();
  
  console.log('✅ Database verification complete. All checks passed.');
}

main()
  .catch((e) => {
    console.error('Verification failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 