import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ReorderContactsDto } from './dto/reorder-contacts.dto';
export declare class EmergencyContactsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, createContactDto: CreateContactDto): Promise<{
        id: string;
        name: string;
        phoneNumber: string;
        email: string | null;
        relationship: string;
        priorityOrder: number;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    findAll(userId: string): Promise<{
        id: string;
        name: string;
        phoneNumber: string;
        email: string | null;
        relationship: string;
        priorityOrder: number;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }[]>;
    findOne(userId: string, id: string): Promise<{
        id: string;
        name: string;
        phoneNumber: string;
        email: string | null;
        relationship: string;
        priorityOrder: number;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    update(userId: string, id: string, updateContactDto: Partial<CreateContactDto>): Promise<{
        id: string;
        name: string;
        phoneNumber: string;
        email: string | null;
        relationship: string;
        priorityOrder: number;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    reorder(userId: string, reorderContactsDto: ReorderContactsDto): Promise<{
        id: string;
        name: string;
        phoneNumber: string;
        email: string | null;
        relationship: string;
        priorityOrder: number;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }[]>;
    delete(userId: string, id: string): Promise<{
        message: string;
    }>;
    getQuickAccess(userId: string): Promise<{
        id: string;
        name: string;
        phoneNumber: string;
        priorityOrder: number;
    }[]>;
}
