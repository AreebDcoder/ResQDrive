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
exports.EmergencyContactsService = void 0;
const common_1 = require("@nestjs/common");
const libphonenumber_js_1 = require("libphonenumber-js");
const prisma_service_1 = require("../prisma/prisma.service");
let EmergencyContactsService = class EmergencyContactsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, createContactDto) {
        const { name, phoneNumber, email, relationship, priorityOrder } = createContactDto;
        const parsedNumber = (0, libphonenumber_js_1.parsePhoneNumberFromString)(phoneNumber, 'PK');
        if (!parsedNumber || !parsedNumber.isValid()) {
            throw new common_1.BadRequestException('Invalid phone number. Please enter a valid Pakistani phone number (e.g. +923001234567).');
        }
        const formattedPhone = parsedNumber.format('E.164');
        const count = await this.prisma.emergencyContact.count({
            where: { userId },
        });
        if (count >= 5) {
            throw new common_1.BadRequestException('Emergency contact limit reached. You can only save up to 5 contacts.');
        }
        let resolvedPriority = priorityOrder;
        if (!resolvedPriority) {
            const maxContact = await this.prisma.emergencyContact.findFirst({
                where: { userId },
                orderBy: { priorityOrder: 'desc' },
            });
            resolvedPriority = maxContact ? maxContact.priorityOrder + 1 : 1;
        }
        const existingAtPriority = await this.prisma.emergencyContact.findFirst({
            where: { userId, priorityOrder: resolvedPriority },
        });
        if (existingAtPriority) {
            const maxContact = await this.prisma.emergencyContact.findFirst({
                where: { userId },
                orderBy: { priorityOrder: 'desc' },
            });
            resolvedPriority = maxContact ? maxContact.priorityOrder + 1 : 1;
        }
        if (resolvedPriority < 1 || resolvedPriority > 5) {
            throw new common_1.BadRequestException('Priority order must be between 1 and 5.');
        }
        return this.prisma.emergencyContact.create({
            data: {
                userId,
                name,
                phoneNumber: formattedPhone,
                email,
                relationship,
                priorityOrder: resolvedPriority,
            },
        });
    }
    async findAll(userId) {
        return this.prisma.emergencyContact.findMany({
            where: { userId },
            orderBy: { priorityOrder: 'asc' },
        });
    }
    async findOne(userId, id) {
        const contact = await this.prisma.emergencyContact.findUnique({
            where: { id },
        });
        if (!contact) {
            throw new common_1.NotFoundException('Emergency contact not found.');
        }
        if (contact.userId !== userId) {
            throw new common_1.ForbiddenException('Access denied. You do not own this contact.');
        }
        return contact;
    }
    async update(userId, id, updateContactDto) {
        const contact = await this.findOne(userId, id);
        const data = { ...updateContactDto };
        if (updateContactDto.phoneNumber) {
            const parsedNumber = (0, libphonenumber_js_1.parsePhoneNumberFromString)(updateContactDto.phoneNumber, 'PK');
            if (!parsedNumber || !parsedNumber.isValid()) {
                throw new common_1.BadRequestException('Invalid phone number format.');
            }
            data.phoneNumber = parsedNumber.format('E.164');
        }
        delete data.priorityOrder;
        return this.prisma.emergencyContact.update({
            where: { id },
            data,
        });
    }
    async reorder(userId, reorderContactsDto) {
        const { orders } = reorderContactsDto;
        const userContacts = await this.prisma.emergencyContact.findMany({
            where: { userId },
        });
        const userContactIds = userContacts.map((c) => c.id);
        const isValid = orders.every((o) => userContactIds.includes(o.contactId));
        if (!isValid) {
            throw new common_1.ForbiddenException('Invalid contacts in reorder payload.');
        }
        return this.prisma.$transaction(async (tx) => {
            for (let i = 0; i < orders.length; i++) {
                const order = orders[i];
                await tx.emergencyContact.update({
                    where: { id: order.contactId },
                    data: { priorityOrder: -(i + 1) },
                });
            }
            for (const order of orders) {
                await tx.emergencyContact.update({
                    where: { id: order.contactId },
                    data: { priorityOrder: order.priorityOrder },
                });
            }
            return tx.emergencyContact.findMany({
                where: { userId },
                orderBy: { priorityOrder: 'asc' },
            });
        });
    }
    async delete(userId, id) {
        await this.findOne(userId, id);
        return this.prisma.$transaction(async (tx) => {
            await tx.emergencyContact.delete({
                where: { id },
            });
            const remaining = await tx.emergencyContact.findMany({
                where: { userId },
                orderBy: { priorityOrder: 'asc' },
            });
            for (let i = 0; i < remaining.length; i++) {
                await tx.emergencyContact.update({
                    where: { id: remaining[i].id },
                    data: { priorityOrder: -(i + 1) },
                });
            }
            for (let i = 0; i < remaining.length; i++) {
                await tx.emergencyContact.update({
                    where: { id: remaining[i].id },
                    data: { priorityOrder: i + 1 },
                });
            }
            return { message: 'Emergency contact removed and list priorities re-sequenced.' };
        });
    }
    async getQuickAccess(userId) {
        return this.prisma.emergencyContact.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                priorityOrder: true,
            },
            orderBy: { priorityOrder: 'asc' },
        });
    }
};
exports.EmergencyContactsService = EmergencyContactsService;
exports.EmergencyContactsService = EmergencyContactsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmergencyContactsService);
//# sourceMappingURL=emergency-contacts.service.js.map