import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { NotificationCategory } from '@prisma/client';
export declare class NotificationsController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    registerDevice(user: {
        id: string;
    }, registerDto: RegisterDeviceDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fcmToken: string;
        platform: string;
    }>;
    removeDeviceToken(user: {
        id: string;
    }, fcmToken: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getPreferences(user: {
        id: string;
    }): Promise<{
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
    updatePreferences(user: {
        id: string;
    }, updateDto: UpdatePreferencesDto): Promise<{
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
    getHistory(user: {
        id: string;
    }, category?: NotificationCategory, isRead?: string, page?: string, limit?: string): Promise<{
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
    markAllAsRead(user: {
        id: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    markAsRead(user: {
        id: string;
    }, id: string): Promise<{
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
}
