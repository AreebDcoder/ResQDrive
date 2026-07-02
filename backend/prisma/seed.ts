import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@resqdrive.com';
  const phoneNumber = '+923000000000';
  
  // Check if admin exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    console.log('Admin user already exists.');
    return;
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('AdminPassword123!', saltRounds);

  const admin = await prisma.user.create({
    data: {
      fullName: 'ResQDrive Admin',
      email,
      phoneNumber,
      passwordHash,
      role: UserRole.ADMIN,
      isVerified: true,
      isActive: true,
    },
  });

  console.log(`Successfully seeded Admin user: ${admin.email} (Password: AdminPassword123!)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
