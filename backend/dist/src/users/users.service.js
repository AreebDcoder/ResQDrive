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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                driverDetails: true,
                mechanicDetails: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found.');
        }
        const { passwordHash, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    async updateProfile(userId, updateProfileDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found.');
        }
        const { fullName, phoneNumber, profilePictureUrl, ...details } = updateProfileDto;
        if (phoneNumber && phoneNumber !== user.phoneNumber) {
            const conflictUser = await this.prisma.user.findUnique({
                where: { phoneNumber },
            });
            if (conflictUser) {
                throw new common_1.ConflictException('Phone number is already registered by another user.');
            }
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: {
                    fullName,
                    phoneNumber,
                    profilePictureUrl,
                },
            });
            if (user.role === client_1.UserRole.DRIVER) {
                await tx.driverDetails.upsert({
                    where: { userId },
                    update: {
                        cnicNumber: details.cnicNumber,
                        drivingLicenseNumber: details.drivingLicenseNumber,
                    },
                    create: {
                        userId,
                        cnicNumber: details.cnicNumber,
                        drivingLicenseNumber: details.drivingLicenseNumber,
                    },
                });
            }
            else if (user.role === client_1.UserRole.MECHANIC) {
                await tx.mechanicDetails.upsert({
                    where: { userId },
                    update: {
                        workshopName: details.workshopName,
                        workshopAddress: details.workshopAddress,
                        specialization: details.specialization,
                    },
                    create: {
                        userId,
                        workshopName: details.workshopName,
                        workshopAddress: details.workshopAddress,
                        specialization: details.specialization,
                    },
                });
            }
        });
        return this.getProfile(userId);
    }
    async changePassword(userId, changePasswordDto) {
        const { currentPassword, newPassword } = changePasswordDto;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found.');
        }
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            throw new common_1.BadRequestException('Incorrect current password.');
        }
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { passwordHash: newPasswordHash },
            });
            await tx.refreshToken.deleteMany({
                where: { userId },
            });
        });
        return { message: 'Password updated successfully. You have been logged out of all devices.' };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map