import { PrismaClient } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BACKUP_DIR = path.join(process.cwd(), 'database-backups');

async function checkDatabase() {
  console.log('🔍 Checking database integrity...');
  
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
  // Note: Database backups for PostgreSQL require pg_dump
  // This is a simplified version that doesn't actually backup for PostgreSQL
  console.log('💾 PostgreSQL backups not implemented in dev mode');
  return true;
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
    
    // For PostgreSQL, we can't easily restore from a file backup in this script
    console.log('⚠️ PostgreSQL restore not implemented in dev mode. Will attempt to seed database.');
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