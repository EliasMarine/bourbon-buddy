#!/usr/bin/env ts-node
/**
 * Database Backup Cron Script
 * 
 * This script is designed to be run as a cron job to create regular backups.
 * It includes timestamped backups, cleanup of old backups, and error handling.
 * 
 * Example cron job (daily at 2 AM):
 * 0 2 * * * cd /path/to/your/app && /usr/local/bin/ts-node scripts/cron-backup.ts >> logs/db-backup.log 2>&1
 */

import fs from 'fs';
import path from 'path';

// Configuration
const DB_PATH = path.join(process.cwd(), 'prisma/dev.db');
const BACKUP_DIR = path.join(process.cwd(), 'database-backups');
const DAILY_BACKUP_DIR = path.join(BACKUP_DIR, 'daily');
const WEEKLY_BACKUP_DIR = path.join(BACKUP_DIR, 'weekly');
const MONTHLY_BACKUP_DIR = path.join(BACKUP_DIR, 'monthly');

// Retention policy
const MAX_DAILY_BACKUPS = 7;   // Keep daily backups for a week
const MAX_WEEKLY_BACKUPS = 4;  // Keep weekly backups for a month
const MAX_MONTHLY_BACKUPS = 6; // Keep monthly backups for 6 months

function getTimestamp() {
  const date = new Date();
  return {
    date: date,
    timestamp: date.toISOString().replace(/[:.]/g, '-'),
    dayOfWeek: date.getDay(),
    dayOfMonth: date.getDate()
  };
}

function ensureDirectoryExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

function createBackup(backupDir: string, prefix: string) {
  const { timestamp } = getTimestamp();
  const backupFileName = `${prefix}-${timestamp}.db`;
  const backupPath = path.join(backupDir, backupFileName);
  
  try {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`Database file not found at ${DB_PATH}`);
    }
    
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`Created backup: ${backupPath}`);
    return true;
  } catch (error) {
    console.error(`Error creating ${prefix} backup:`, error);
    return false;
  }
}

function cleanupOldBackups(backupDir: string, maxBackups: number) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        ctime: fs.statSync(path.join(backupDir, file)).ctime.getTime()
      }))
      .sort((a, b) => b.ctime - a.ctime); // newest first
    
    if (files.length > maxBackups) {
      const filesToRemove = files.slice(maxBackups);
      for (const file of filesToRemove) {
        fs.unlinkSync(file.path);
        console.log(`Removed old backup: ${file.name}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

async function main() {
  const startTime = new Date();
  console.log(`Backup job started at ${startTime.toISOString()}`);
  
  // Ensure backup directories exist
  ensureDirectoryExists(BACKUP_DIR);
  ensureDirectoryExists(DAILY_BACKUP_DIR);
  ensureDirectoryExists(WEEKLY_BACKUP_DIR);
  ensureDirectoryExists(MONTHLY_BACKUP_DIR);
  
  const { dayOfWeek, dayOfMonth } = getTimestamp();
  
  // Create daily backup
  const dailySuccess = createBackup(DAILY_BACKUP_DIR, 'daily');
  
  // Create weekly backup (on Sundays)
  if (dayOfWeek === 0) {
    const weeklySuccess = createBackup(WEEKLY_BACKUP_DIR, 'weekly');
  }
  
  // Create monthly backup (on the 1st of the month)
  if (dayOfMonth === 1) {
    const monthlySuccess = createBackup(MONTHLY_BACKUP_DIR, 'monthly');
  }
  
  // Clean up old backups
  cleanupOldBackups(DAILY_BACKUP_DIR, MAX_DAILY_BACKUPS);
  cleanupOldBackups(WEEKLY_BACKUP_DIR, MAX_WEEKLY_BACKUPS);
  cleanupOldBackups(MONTHLY_BACKUP_DIR, MAX_MONTHLY_BACKUPS);
  
  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;
  console.log(`Backup job completed at ${endTime.toISOString()} (duration: ${duration}s)`);
}

// Run backup job
main()
  .catch((error) => {
    console.error('Backup job failed:', error);
    process.exit(1);
  }); 