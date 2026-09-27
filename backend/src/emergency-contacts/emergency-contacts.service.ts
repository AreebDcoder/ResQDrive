import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ReorderContactsDto } from './dto/reorder-contacts.dto';

@Injectable()
export class EmergencyContactsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createContactDto: CreateContactDto) {
    const { name, phoneNumber, email, relationship, priorityOrder } = createContactDto;

    // 1. Phone number validation using libphonenumber-js (Pakistani format)
    const parsedNumber = parsePhoneNumberFromString(phoneNumber, 'PK');
    if (!parsedNumber || !parsedNumber.isValid()) {
      throw new BadRequestException(
        'Invalid phone number. Please enter a valid Pakistani phone number (e.g. +923001234567).'
      );
    }
    const formattedPhone = parsedNumber.format('E.164'); // Standard E.164 format

    // 2. Enforce max 5 contacts rule at data layer
    const count = await this.prisma.emergencyContact.count({
      where: { userId },
    });
    if (count >= 5) {
      throw new BadRequestException('Emergency contact limit reached. You can only save up to 5 contacts.');
    }

    // 3. Resolve priority order
    let resolvedPriority = priorityOrder;
    if (!resolvedPriority) {
      // Find current max priority or default to 1
      const maxContact = await this.prisma.emergencyContact.findFirst({
        where: { userId },
        orderBy: { priorityOrder: 'desc' },
      });
      resolvedPriority = maxContact ? maxContact.priorityOrder + 1 : 1;
    }

    // Double check that the resolved priority is not already occupied
    const existingAtPriority = await this.prisma.emergencyContact.findFirst({
      where: { userId, priorityOrder: resolvedPriority },
    });

    if (existingAtPriority) {
      // If requested slot is taken, insert at the end instead of crashing unique constraint
      const maxContact = await this.prisma.emergencyContact.findFirst({
        where: { userId },
        orderBy: { priorityOrder: 'desc' },
      });
      resolvedPriority = maxContact ? maxContact.priorityOrder + 1 : 1;
    }

    // Safeguard priority is between 1 and 5
    if (resolvedPriority < 1 || resolvedPriority > 5) {
      throw new BadRequestException('Priority order must be between 1 and 5.');
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

  async findAll(userId: string) {
    return this.prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { priorityOrder: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const contact = await this.prisma.emergencyContact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('Emergency contact not found.');
    }

    if (contact.userId !== userId) {
      throw new ForbiddenException('Access denied. You do not own this contact.');
    }

    return contact;
  }

  async update(userId: string, id: string, updateContactDto: Partial<CreateContactDto>) {
    const contact = await this.findOne(userId, id); // validates ownership and existence

    const data: any = { ...updateContactDto };

    // If phone number is updated, validate it
    if (updateContactDto.phoneNumber) {
      const parsedNumber = parsePhoneNumberFromString(updateContactDto.phoneNumber, 'PK');
      if (!parsedNumber || !parsedNumber.isValid()) {
        throw new BadRequestException('Invalid phone number format.');
      }
      data.phoneNumber = parsedNumber.format('E.164');
    }

    // Prevent direct update of priority order through this endpoint
    delete data.priorityOrder;

    return this.prisma.emergencyContact.update({
      where: { id },
      data,
    });
  }

  /**
   * Reorder priority list in a single transaction.
   * Uses temporary negative placeholders to bypass composite unique key (userId, priorityOrder) conflicts.
   */
  async reorder(userId: string, reorderContactsDto: ReorderContactsDto) {
    const rawOrders = reorderContactsDto?.orders || [];

    const userContacts = await this.prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { priorityOrder: 'asc' },
    });

    if (userContacts.length === 0) return [];

    const userContactMap = new Map(userContacts.map((c) => [c.id, c]));

    const orderedIds: string[] = [];
    for (const item of rawOrders) {
      const cid = (item as any).contactId || (item as any).id;
      if (cid && userContactMap.has(cid) && !orderedIds.includes(cid)) {
        orderedIds.push(cid);
      }
    }
    // Append any missing contacts to preserve full list
    for (const c of userContacts) {
      if (!orderedIds.includes(c.id)) {
        orderedIds.push(c.id);
      }
    }

    // Atomic transaction using temporary 1000+ offset to prevent unique constraint collisions
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Shift all user contacts to temporary offset
      for (let i = 0; i < userContacts.length; i++) {
        await tx.emergencyContact.update({
          where: { id: userContacts[i].id },
          data: { priorityOrder: 1000 + i },
        });
      }

      // Step 2: Assign final contiguous priority orders (1, 2, 3...)
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.emergencyContact.update({
          where: { id: orderedIds[i] },
          data: { priorityOrder: i + 1 },
        });
      }

      return tx.emergencyContact.findMany({
        where: { userId },
        orderBy: { priorityOrder: 'asc' },
      });
    });
  }

  /**
   * Delete contact and re-sequence remaining priorities contiguously (1, 2, 3...)
   */
  async delete(userId: string, id: string) {
    await this.findOne(userId, id); // validates ownership and existence

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete target contact
      await tx.emergencyContact.delete({
        where: { id },
      });

      // 2. Get remaining contacts ordered by priority
      const remaining = await tx.emergencyContact.findMany({
        where: { userId },
        orderBy: { priorityOrder: 'asc' },
      });

      // 3. Shift remaining values to temporary negative indicators to bypass unique key issues
      for (let i = 0; i < remaining.length; i++) {
        await tx.emergencyContact.update({
          where: { id: remaining[i].id },
          data: { priorityOrder: -(i + 1) },
        });
      }

      // 4. Re-sequence them to contiguous 1-indexed numbers (1, 2, 3, 4...)
      for (let i = 0; i < remaining.length; i++) {
        await tx.emergencyContact.update({
          where: { id: remaining[i].id },
          data: { priorityOrder: i + 1 },
        });
      }

      return { message: 'Emergency contact removed and list priorities re-sequenced.' };
    });
  }

  async getQuickAccess(userId: string) {
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
}
