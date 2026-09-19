import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@resqdrive.com';
  const phoneNumber = '+923000000000';

  // 1. Admin Seed
  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingAdmin) {
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
  } else {
    console.log('Admin user already exists.');
  }

  // 2. Regional Emergency Numbers Seed
  console.log('Refreshing regional emergency numbers...');

  // Delete old numbers so we can re-insert cleanly
  await prisma.regionalEmergencyNumber.deleteMany({});

  const numbers = [
    // 4-digit shortcodes (manual dialer only)
    { regionName: 'Punjab / Islamabad', serviceName: 'Rescue 1122 (Emergency Hotline)', phoneNumber: '1122', priorityOrder: 1, isActive: true },
    { regionName: 'Karachi', serviceName: 'Edhi Foundation (Hotline)', phoneNumber: '115', priorityOrder: 1, isActive: true },
    { regionName: 'Karachi', serviceName: 'Chhipa Welfare (Hotline)', phoneNumber: '1020', priorityOrder: 2, isActive: true },
    { regionName: 'Khyber Pakhtunkhwa', serviceName: 'Rescue 1122 KPK (Hotline)', phoneNumber: '1122', priorityOrder: 1, isActive: true },

    // 11-digit landlines (CAN auto-dial without user interaction)
    { regionName: 'Islamabad / Rawalpindi', serviceName: 'Rescue 1122 HQ (Auto-Dial)', phoneNumber: '0519290002', priorityOrder: 1, isActive: true },
    { regionName: 'Lahore', serviceName: 'Rescue 1122 HQ (Auto-Dial)', phoneNumber: '04299231701', priorityOrder: 1, isActive: true },
    { regionName: 'Faisalabad', serviceName: 'Rescue 1122 (Auto-Dial)', phoneNumber: '0419201122', priorityOrder: 1, isActive: true },
    { regionName: 'Peshawar / KP', serviceName: 'Rescue 1122 (Auto-Dial)', phoneNumber: '0919212222', priorityOrder: 1, isActive: true },
    { regionName: 'Multan', serviceName: 'Rescue 1122 (Auto-Dial)', phoneNumber: '0619200382', priorityOrder: 1, isActive: true },
    { regionName: 'Karachi', serviceName: 'Edhi Foundation (Auto-Dial)', phoneNumber: '021111334433', priorityOrder: 1, isActive: true },
  ];

  for (const num of numbers) {
    await prisma.regionalEmergencyNumber.create({ data: num });
  }

  console.log(`✅ Successfully seeded ${numbers.length} regional emergency numbers!`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });