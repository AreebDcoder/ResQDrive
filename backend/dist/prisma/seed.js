"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    const email = 'admin@resqdrive.com';
    const phoneNumber = '+923000000000';
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
            role: client_1.UserRole.ADMIN,
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
//# sourceMappingURL=seed.js.map