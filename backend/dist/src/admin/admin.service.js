"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let AdminService = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listUsers(page = 1, limit = 10, role, isActive) {
        const skip = (page - 1) * limit;
        const where = {};
        if (role) {
            where.role = role;
        }
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    driverDetails: true,
                    mechanicDetails: true,
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        const sanitizedUsers = users.map((user) => {
            const { passwordHash, ...rest } = user;
            return rest;
        });
        return {
            users: sanitizedUsers,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async changeUserRole(userId, newRole) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found.');
        }
        if (user.role === newRole) {
            return { message: `User is already in the ${newRole} role.` };
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { role: newRole },
            });
            if (newRole === client_1.UserRole.DRIVER) {
                await tx.driverDetails.upsert({
                    where: { userId },
                    update: {},
                    create: { userId },
                });
            }
            else if (newRole === client_1.UserRole.MECHANIC) {
                await tx.mechanicDetails.upsert({
                    where: { userId },
                    update: {},
                    create: { userId },
                });
            }
        });
        return { message: `Successfully updated user role to ${newRole}.` };
    }
    async changeUserStatus(userId, isActive) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found.');
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: { isActive },
        });
        if (!isActive) {
            await this.prisma.refreshToken.deleteMany({
                where: { userId },
            });
        }
        return { message: `Successfully ${isActive ? 'activated' : 'deactivated'} the user account.` };
    }
    async verifyWorkshop(userId, isWorkshopVerified) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { mechanicDetails: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found.');
        }
        if (user.role !== client_1.UserRole.MECHANIC) {
            throw new common_1.BadRequestException('User is not a Mechanic.');
        }
        await this.prisma.mechanicDetails.update({
            where: { userId },
            data: { isWorkshopVerified },
        });
        return { message: `Workshop verification status set to ${isWorkshopVerified}.` };
    }
    async deleteUser(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found.');
        }
        await this.prisma.user.delete({
            where: { id: userId },
        });
        return { message: 'User account has been permanently deleted.' };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map