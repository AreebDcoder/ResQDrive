import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { NotificationCategory } from '@prisma/client';
export declare class NotificationsService implements OnModuleInit {
    private prisma;
    private isFirebaseInitialized;
    constructor(prisma: PrismaService);
    onModuleInit(): void;
    private initializeFirebase;
    registerDevice(userId: string, registerDto: RegisterDeviceDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fcmToken: string;
        platform: string;
    }>;
    removeDeviceToken(userId: string, fcmToken: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getPreferences(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        drivingModeEnabled: boolean;
        alertDeliveryEnabled: boolean;
        falseAlarmLogEnabled: boolean;
        systemStatusEnabled: boolean;
        generalEnabled: boolean;
    }>;
    updatePreferences(userId: string, updateDto: UpdatePreferencesDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        drivingModeEnabled: boolean;
        alertDeliveryEnabled: boolean;
        falseAlarmLogEnabled: boolean;
        systemStatusEnabled: boolean;
        generalEnabled: boolean;
    }>;
    getHistory(userId: string, category?: NotificationCategory, isRead?: boolean, page?: number, limit?: number): Promise<{
        logs: {
            id: string;
            createdAt: Date;
            title: string;
            userId: string;
            category: import(".prisma/client").$Enums.NotificationCategory;
            body: string;
            isRead: boolean;
            deliveryStatus: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    markAsRead(userId: string, logId: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        userId: string;
        category: import(".prisma/client").$Enums.NotificationCategory;
        body: string;
        isRead: boolean;
        deliveryStatus: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    markAllAsRead(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    send(userId: string, category: NotificationCategory, title: string, body: string, metadata?: any): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        userId: string;
        category: import(".prisma/client").$Enums.NotificationCategory;
        body: string;
        isRead: boolean;
        deliveryStatus: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    } | {
        success: boolean;
        reason: string;
    }>;
    sendDrivingModeStatus(userId: string, isActive: boolean): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        userId: string;
        category: import(".prisma/client").$Enums.NotificationCategory;
        body: string;
        isRead: boolean;
        deliveryStatus: string;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
    } | {
        success: boolean;
        reason: string;
    }>;
}
