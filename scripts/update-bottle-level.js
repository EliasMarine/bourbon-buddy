// Script to update bottle level values from 0-8 to 0-100 scale
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting bottle level scale update...');
  
  try {
    // Read the migration SQL file
    const migrationFile = path.join(
      __dirname, 
      '../prisma/migrations/20250329_update_bottle_level_scale/migration.sql'
    );
    
    const sql = fs.readFileSync(migrationFile, 'utf-8');
    
    // Execute the raw SQL query
    await prisma.$executeRawUnsafe(sql);
    
    console.log('Successfully updated bottle level scale');
    
    // Check a few records to confirm the update
    const spirits = await prisma.spirit.findMany({
      select: {
        id: true,
        name: true,
        bottleLevel: true,
      },
      take: 5,
    });
    
    console.log('Sample updated records:');
    spirits.forEach(spirit => {
      console.log(`ID: ${spirit.id}, Name: ${spirit.name}, Bottle Level: ${spirit.bottleLevel}`);
    });
    
  } catch (error) {
    console.error('Error updating bottle level scale:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 