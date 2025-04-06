import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Count users
  const userCount = await prisma.user.count();
  console.log(`Number of users: ${userCount}`);
  
  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
    }
  });
  console.log('Users:', users);
  
  // Count spirits
  const spiritCount = await prisma.spirit.count();
  console.log(`Number of spirits: ${spiritCount}`);
  
  // Get all spirits
  const spirits = await prisma.spirit.findMany({
    select: {
      id: true,
      name: true,
      brand: true,
      type: true,
      ownerId: true,
    }
  });
  console.log('Spirits:', spirits);
  
  // Count reviews
  const reviewCount = await prisma.review.count();
  console.log(`Number of reviews: ${reviewCount}`);
  
  // Get all reviews
  const reviews = await prisma.review.findMany();
  console.log('Reviews:', reviews);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 