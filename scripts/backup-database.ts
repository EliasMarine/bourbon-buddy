import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const DB_PATH = path.join(process.cwd(), 'prisma/dev.db');
const BACKUP_DIR = path.join(process.cwd(), 'database-backups');
const MAX_BACKUPS = 10; // Number of backups to keep

async function createBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory at ${BACKUP_DIR}`);
  }
}

async function getBackupFileName() {
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  return `backup-${timestamp}.db`;
}

async function cleanupOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR);
  
  // Sort files by creation time (oldest first)
  const sortedFiles = files
    .filter(file => file.endsWith('.db'))
    .map(file => ({
      name: file,
      path: path.join(BACKUP_DIR, file),
      ctime: fs.statSync(path.join(BACKUP_DIR, file)).ctime.getTime()
    }))
    .sort((a, b) => a.ctime - b.ctime);

  // Remove oldest backups if we have more than MAX_BACKUPS
  if (sortedFiles.length > MAX_BACKUPS) {
    const filesToRemove = sortedFiles.slice(0, sortedFiles.length - MAX_BACKUPS);
    for (const file of filesToRemove) {
      fs.unlinkSync(file.path);
      console.log(`Removed old backup: ${file.name}`);
    }
  }
}

async function backupDatabase() {
  try {
    // Check if DB exists
    if (!fs.existsSync(DB_PATH)) {
      console.error(`Database file not found at ${DB_PATH}`);
      return;
    }

    // Create backup directory if it doesn't exist
    await createBackupDir();

    // Generate backup filename
    const backupFileName = await getBackupFileName();
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    // Copy the database file
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`Database backed up to ${backupPath}`);

    // Cleanup old backups
    await cleanupOldBackups();

    console.log('Backup completed successfully');
  } catch (error) {
    console.error('Backup failed:', error);
  }
}

// Run backup
backupDatabase(); 