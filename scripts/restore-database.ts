import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';

const execAsync = promisify(exec);

// Configuration
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

async function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`Backup directory not found at ${BACKUP_DIR}`);
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR);
  
  // Filter and sort backup files (newest first)
  const backupFiles = files
    .filter(file => file.endsWith('.db'))
    .map(file => ({
      name: file,
      path: path.join(BACKUP_DIR, file),
      ctime: fs.statSync(path.join(BACKUP_DIR, file)).ctime.getTime()
    }))
    .sort((a, b) => b.ctime - a.ctime);
  
  return backupFiles;
}

async function selectBackup() {
  const backups = await listBackups();
  
  if (backups.length === 0) {
    console.error('No backups found');
    process.exit(1);
  }
  
  console.log('Available backups:');
  backups.forEach((backup, index) => {
    const date = new Date(backup.ctime);
    console.log(`[${index + 1}] ${backup.name} (${date.toLocaleString()})`);
  });
  
  return new Promise<string>((resolve) => {
    rl.question('Select a backup number to restore: ', (answer) => {
      const index = parseInt(answer) - 1;
      if (isNaN(index) || index < 0 || index >= backups.length) {
        console.error('Invalid selection');
        process.exit(1);
      }
      resolve(backups[index].path);
    });
  });
}

async function restoreDatabase() {
  try {
    console.log('Database Restore Utility');
    console.log('------------------------');
    
    const backupPath = await selectBackup();
    
    // Check if current DB exists and backup before overwriting
    if (fs.existsSync(DB_PATH)) {
      const confirmed = await promptForConfirmation(
        `Warning: This will overwrite your current database at ${DB_PATH}. Do you want to continue?`
      );
      
      if (!confirmed) {
        console.log('Restore cancelled');
        process.exit(0);
      }
      
      // Create backup of current DB
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const currentDbBackupPath = path.join(BACKUP_DIR, `pre-restore-${timestamp}.db`);
      fs.copyFileSync(DB_PATH, currentDbBackupPath);
      console.log(`Backed up current database to ${currentDbBackupPath}`);
    }
    
    // Restore the backup
    fs.copyFileSync(backupPath, DB_PATH);
    console.log(`Database restored from ${backupPath}`);
    
    console.log('Restore completed successfully');
  } catch (error) {
    console.error('Restore failed:', error);
  } finally {
    rl.close();
  }
}

// Run restore
restoreDatabase(); 