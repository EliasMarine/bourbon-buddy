// This is a simplified debugging script to test Prisma import
import { PrismaClient } from '@prisma/client';
import * as path from 'path';

console.log('Attempting to import Prisma client directly');

try {
  console.log('Current directory:', process.cwd());
  console.log('__dirname:', __dirname);
  console.log('Resolve path:', path.resolve(__dirname, '../src/lib/prisma'));
  
  // Try with a direct instance
  const prismaDirectClient = new PrismaClient();
  console.log('Direct Prisma client created successfully');
  
  // Try a DB connection
  async function testConnection() {
    try {
      await prismaDirectClient.$connect();
      console.log('Database connection successful!');
      
      // Try a simple query
      const userCount = await prismaDirectClient.user.count();
      console.log(`Found ${userCount} users in the database`);
      
      await prismaDirectClient.$disconnect();
    } catch (error) {
      console.error('Failed to connect to database:', error);
    }
  }
  
  testConnection();
  
} catch (error) {
  console.error('Error creating Prisma client:', error);
}

// Now try to dynamically import the prisma module
async function tryImport() {
  try {
    console.log('Attempting dynamic import...');
    // Using path.join for Windows compatibility
    const modulePath = path.join(process.cwd(), 'src', 'lib', 'prisma');
    console.log('Module path:', modulePath);
    
    // Use dynamic import to load the module
    const { prisma } = await import(modulePath);
    console.log('Import successful!', typeof prisma);
    
    return true;
  } catch (error) {
    console.error('Dynamic import failed:', error);
    return false;
  }
}

tryImport(); 