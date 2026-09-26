import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminUpdateContactDto } from './dto/admin-update-contact.dto';

/**
 * AdminEmergencyContactsService — admin-scoped emergency contact management.
 *
 * Bypasses user-scoped ownership checks.
 *
 * Methods:
 *   - listAll(query) — paginated list with filters (search by name/phone/owner,
 *     filter by userId)
 *   - findOne(id) — single contact with owner info
 *   - update(id, dto) — admin edit of contact fields (phone validated via libphonenumber)
 *   - remove(id) — hard delete contact. Re-sequences remaining priorities
 *     contiguously for the same owner.
 */
@Injectable()
export class AdminEmergencyContactsService {
  constructor(private prisma: PrismaService) {}

  async listAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
    relationship?: string;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.relationship) where.relationship = { contains: query.relationship, mode: 'insensitive' };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phoneNumber: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { relationship: { contains: query.search, mode: 'insensitive' } },
        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.emergencyContact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
        },
      }),
      this.prisma.emergencyContact.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const contact = await this.prisma.emergencyContact.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true, phoneNumber: true, role: true } },
      },
    });
    if (!contact) {
      throw new NotFoundException('Emergency contact not found.');
    }
    return contact;
  }

  async update(id: string, dto: AdminUpdateContactDto) {
    const contact = await this.prisma.emergencyContact.findUnique({ where: { id } });
    if (!contact) {
      throw new NotFoundException('Emergency contact not found.');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.relationship !== undefined) data.relationship = dto.relationship;

    if (dto.phoneNumber !== undefined) {
      const parsedNumber = parsePhoneNumberFromString(dto.phoneNumber, 'PK');
      if (!parsedNumber || !parsedNumber.isValid()) {
        throw new BadRequestException('Invalid phone number. Please enter a valid Pakistani phone number (e.g. +923001234567).');
      }
      data.phoneNumber = parsedNumber.format('E.164');
    }

    return this.prisma.emergencyContact.update({ where: { id }, data });
  }

  async remove(id: string) {
    const contact = await this.prisma.emergencyContact.findUnique({ where: { id } });
    if (!contact) {
      throw new NotFoundException('Emergency contact not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.emergencyContact.delete({ where: { id } });

      // Re-sequence remaining priorities contiguously for the same owner
      const remaining = await tx.emergencyContact.findMany({
        where: { userId: contact.userId },
        orderBy: { priorityOrder: 'asc' },
      });
      // First shift to negative temp values to bypass unique key
      for (let i = 0; i < remaining.length; i++) {
        await tx.emergencyContact.update({
          where: { id: remaining[i].id },
          data: { priorityOrder: -(i + 1) },
        });
      }
      // Then shift to final contiguous 1..N values
      for (let i = 0; i < remaining.length; i++) {
        await tx.emergencyContact.update({
          where: { id: remaining[i].id },
          data: { priorityOrder: i + 1 },
        });
      }

      return { message: 'Emergency contact removed and priorities re-sequenced.' };
    });
  }
}
