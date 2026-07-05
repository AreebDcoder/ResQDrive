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
        email: string | null;
        phoneNumber: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        userId: string;
        relationship: string;
        priorityOrder: number;
    }>;
    findAll(user: {
        id: string;
    }): Promise<{
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
    getQuickAccess(user: {
        id: string;
    }): Promise<{
        id: string;
        phoneNumber: string;
        name: string;
        priorityOrder: number;
    }[]>;
    findOne(user: {
        id: string;
    }, id: string): Promise<{
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
    reorder(user: {
        id: string;
    }, reorderDto: ReorderContactsDto): Promise<{
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
    update(user: {
        id: string;
    }, id: string, updateContactDto: Partial<CreateContactDto>): Promise<{
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
    delete(user: {
        id: string;
    }, id: string): Promise<{
        message: string;
    }>;
}
