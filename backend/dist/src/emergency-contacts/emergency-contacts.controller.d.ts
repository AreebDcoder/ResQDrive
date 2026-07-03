import { EmergencyContactsService } from './emergency-contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ReorderContactsDto } from './dto/reorder-contacts.dto';
export declare class EmergencyContactsController {
    private contactsService;
    constructor(contactsService: EmergencyContactsService);
    create(user: {
        id: string;
    }, createContactDto: CreateContactDto): Promise<{
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
    findAll(user: {
        id: string;
    }): Promise<{
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
    getQuickAccess(user: {
        id: string;
    }): Promise<{
        id: string;
        name: string;
        phoneNumber: string;
        priorityOrder: number;
    }[]>;
    findOne(user: {
        id: string;
    }, id: string): Promise<{
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
    reorder(user: {
        id: string;
    }, reorderDto: ReorderContactsDto): Promise<{
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
    update(user: {
        id: string;
    }, id: string, updateContactDto: Partial<CreateContactDto>): Promise<{
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
    delete(user: {
        id: string;
    }, id: string): Promise<{
        message: string;
    }>;
}
