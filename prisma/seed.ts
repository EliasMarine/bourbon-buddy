import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clean the database
  await prisma.review.deleteMany({});
  await prisma.spirit.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Database cleaned');

  // Create users
  const password = await bcrypt.hash('Password123!', 10);
  
  const user1 = await prisma.user.create({
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      username: 'johndoe',
      password,
      image: 'https://randomuser.me/api/portraits/men/1.jpg',
      publicProfile: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      username: 'janesmith',
      password,
      image: 'https://randomuser.me/api/portraits/women/1.jpg',
      publicProfile: true,
    },
  });

  console.log('Users created');

  // Create spirits
  const spirit1 = await prisma.spirit.create({
    data: {
      name: 'Buffalo Trace',
      brand: 'Buffalo Trace Distillery',
      type: 'Bourbon',
      category: 'whiskey',
      description: 'A classic bourbon with notes of vanilla, caramel, and oak.',
      proof: 90,
      price: 29.99,
      bottleSize: '750ml',
      distillery: 'Buffalo Trace Distillery',
      bottleLevel: 100,
      isFavorite: true,
      ownerId: user1.id,
      nose: 'Vanilla, mint, molasses',
      palate: 'Caramel, brown sugar, spice',
      finish: 'Medium, smooth with a touch of spice',
    },
  });

  const spirit2 = await prisma.spirit.create({
    data: {
      name: 'Blanton\'s Original',
      brand: 'Blanton\'s',
      type: 'Bourbon',
      category: 'whiskey',
      description: 'Single barrel bourbon with a rich, nutty flavor.',
      proof: 93,
      price: 59.99,
      bottleSize: '750ml',
      distillery: 'Buffalo Trace Distillery',
      bottleLevel: 90,
      isFavorite: false,
      ownerId: user1.id,
      nose: 'Nutmeg, vanilla, and caramel',
      palate: 'Citrus, oak, and spice',
      finish: 'Medium to long with notes of vanilla and caramel',
    },
  });

  const spirit3 = await prisma.spirit.create({
    data: {
      name: 'Maker\'s Mark',
      brand: 'Maker\'s Mark',
      type: 'Bourbon',
      category: 'whiskey',
      description: 'Wheated bourbon with a smooth, sweet profile.',
      proof: 90,
      price: 24.99,
      bottleSize: '750ml',
      distillery: 'Maker\'s Mark Distillery',
      bottleLevel: 75,
      isFavorite: false,
      ownerId: user2.id,
      nose: 'Vanilla, caramel, and wheat',
      palate: 'Sweet and smooth with vanilla and caramel',
      finish: 'Clean and smooth with a touch of sweetness',
    },
  });

  console.log('Spirits created');

  // Create reviews
  await prisma.review.create({
    data: {
      content: 'A solid everyday bourbon that never disappoints.',
      rating: 4,
      userId: user2.id,
      spiritId: spirit1.id,
    },
  });

  await prisma.review.create({
    data: {
      content: 'One of my all-time favorites. Worth every penny.',
      rating: 5,
      userId: user1.id,
      spiritId: spirit2.id,
    },
  });

  await prisma.review.create({
    data: {
      content: 'Smooth and easy to drink, great for cocktails.',
      rating: 4,
      userId: user1.id,
      spiritId: spirit3.id,
    },
  });

  console.log('Reviews created');

  console.log('Database has been seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 