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
  // Seed default LaborCostRates if empty or missing
  const partTags = [
    'front_bumper', 'rear_bumper', 'bonnet', 'left_mirror', 'right_mirror',
    'headlight', 'taillight', 'door', 'windshield', 'roof', 'tire', 'other'
  ] as const;

  const actions = ['repair', 'replace'] as const;

  for (const partTag of partTags) {
    for (const action of actions) {
      await prisma.laborCostRate.upsert({
        where: {
          partTag_action: { partTag, action }
        },
        update: {},
        create: {
          partTag,
          action,
          minCostPkr: action === 'replace' ? 2500 : 1500,
          maxCostPkr: action === 'replace' ? 6000 : 4000,
        }
      });
    }
  }
  console.log('Successfully seeded LaborCostRates for all car parts.');

  // Seed sample verified workshop mechanics
  const mechanicEmail = 'mechanic@resqdrive.com';
  const existingMechanic = await prisma.user.findUnique({ where: { email: mechanicEmail } });
  if (!existingMechanic) {
    const passwordHash = await bcrypt.hash('MechanicPassword123!', 10);
    await prisma.user.create({
      data: {
        fullName: 'AutoCare Workshop (Islamabad)',
        email: mechanicEmail,
        phoneNumber: '+923001112233',
        passwordHash,
        role: UserRole.MECHANIC,
        isVerified: true,
        isActive: true,
        mechanicDetails: {
          create: {
            workshopName: 'AutoCare Master Repairs',
            workshopAddress: 'Blue Area, Islamabad, Pakistan',
            workshopLatitude: 33.7182,
            workshopLongitude: 73.0601,
            isWorkshopVerified: true,
            specialization: 'Bodywork, Denting & Painting',
          }
        }
      }
    });
    console.log('Successfully seeded sample verified workshop mechanic.');
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });