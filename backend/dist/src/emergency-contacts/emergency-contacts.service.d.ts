import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ReorderContactsDto } from './dto/reorder-contacts.dto';
export declare class EmergencyContactsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, createContactDto: CreateContactDto): Promise<{
        id: string;
        email: string | null;
        phoneNumber: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
        relationship: string;
        priorityOrder: number;
    }>;
    findAll(userId: string): Promise<{
        id: string;
        email: string | null;
        phoneNumber: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
        relationship: string;
        priorityOrder: number;
    }[]>;
    findOne(userId: string, id: string): Promise<{
        id: string;
        email: string | null;
        phoneNumber: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
        relationship: string;
        priorityOrder: number;
    }>;
    update(userId: string, id: string, updateContactDto: Partial<CreateContactDto>): Promise<{
        id: string;
        email: string | null;
        phoneNumber: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
        relationship: string;
        priorityOrder: number;
    }>;
    reorder(userId: string, reorderContactsDto: ReorderContactsDto): Promise<{
        id: string;
        email: string | null;
        phoneNumber: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
        relationship: string;
        priorityOrder: number;
    }[]>;
    delete(userId: string, id: string): Promise<{
        message: string;
    }>;
    getQuickAccess(userId: string): Promise<{
        id: string;
        phoneNumber: string;
        name: string;
        priorityOrder: number;
    }[]>;
}
