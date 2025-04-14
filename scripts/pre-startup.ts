import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Create a direct Prisma client instead of importing
// Include better error handling for database connection issues
let prisma: PrismaClient;
try {
  console.log('Creating Prisma client...');
  prisma = new PrismaClient({
    log: ['error', 'warn', 'query'],
  });
  console.log('Prisma client created successfully');
} catch (error) {
  console.error('Failed to create Prisma client:', error);
  process.exit(1);
}

const BACKUP_DIR = path.join(process.cwd(), 'database-backups');

async function checkDatabase() {
  console.log('🔍 Checking database integrity...');
  
  try {
    // Test database connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check user table to ensure database is usable
    console.log('Checking user table...');
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in the database`);
    
    if (userCount === 0) {
      console.warn('⚠️ No users found in the database. Consider running the seed script.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    
    // Check specific error types for more helpful messages
    if (error instanceof Error) {
      if (error.message.includes('database') && error.message.includes('does not exist')) {
        console.error('❌ The database does not exist. Please create it first.');
      } else if (error.message.includes('connect ECONNREFUSED')) {
        console.error('❌ Could not connect to the database server. Make sure it is running.');
      } else if (error.message.includes('authentication failed')) {
        console.error('❌ Database authentication failed. Check your credentials in .env');
      }
    }
    
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
    console.log('Checking if database needs seeding...');
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      console.log('🌱 No users found. Seeding the database...');
      
      try {
        console.log('Running seed script...');
        execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit' });
        console.log('✅ Database seeded successfully');
        return true;
      } catch (error) {
        console.error('❌ Error seeding database:', error);
        return false;
      }
    } else {
      console.log('✅ Database already contains users, skipping seed');
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
  const seedOk = await seedIfNeeded();
  if (!seedOk) {
    console.warn('⚠️ Database seeding failed or was skipped');
  }
  
  console.log('✅ Pre-startup checks completed');
}

main()
  .catch((e) => {
    console.error('❌ Pre-startup checks failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      console.log('Disconnecting from database...');
      await prisma.$disconnect();
      console.log('Database disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting from database:', error);
    }
  }); 