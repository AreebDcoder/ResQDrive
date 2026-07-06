import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const numbers = [
    { region: 'PUNJAB_ISLAMABAD', name: 'Rescue 1122', number: '1122' },
    { region: 'KARACHI', name: 'Edhi Foundation', number: '115' },
    { region: 'KARACHI', name: 'Chhipa Welfare', number: '1020' },
    { region: 'KPK', name: 'Rescue 1122 KPK', number: '1122' },
  ];

  for (const n of numbers) {
    const existing = await prisma.emergencyNumber.findFirst({
      where: { region: n.region, name: n.name },
    });
    if (!existing) {
      await prisma.emergencyNumber.create({ data: n });
    }
  }

  console.log('Emergency numbers seeded.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());