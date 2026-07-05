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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const admin = require("firebase-admin");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let NotificationsService = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.isFirebaseInitialized = false;
    }
    onModuleInit() {
        this.initializeFirebase();
    }
    initializeFirebase() {
        try {
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY;
            if (projectId && clientEmail && privateKey) {
                if (admin.apps.length === 0) {
                    admin.initializeApp({
                        credential: admin.credential.cert({
                            projectId,
                            clientEmail,
                            privateKey: privateKey.replace(/\\n/g, '\n'),
                        }),
                    });
                }
                this.isFirebaseInitialized = true;
                console.log('Firebase Admin SDK initialized successfully.');
            }
            else {
                console.warn('Firebase credentials missing in environment variables. Running in console/DB fallback logging mode.');
                this.isFirebaseInitialized = false;
            }
        }
        catch (error) {
            console.warn('Failed to initialize Firebase Admin SDK. Fallback mock logger active. Error:', error.message);
            this.isFirebaseInitialized = false;
        }
    }
    async registerDevice(userId, registerDto) {
        const { fcmToken, platform } = registerDto;
        return this.prisma.deviceToken.upsert({
            where: {
                userId_fcmToken: {
                    userId,
                    fcmToken,
                },
            },
            update: {
                platform,
                isActive: true,
                updatedAt: new Date(),
            },
            create: {
                userId,
                fcmToken,
                platform,
                isActive: true,
            },
        });
    }
    async removeDeviceToken(userId, fcmToken) {
        try {
            await this.prisma.deviceToken.delete({
                where: {
                    userId_fcmToken: {
                        userId,
                        fcmToken,
                    },
                },
            });
            return { success: true, message: 'Device token removed successfully.' };
        }
        catch (error) {
            throw new common_1.NotFoundException('FCM device token not found for this user.');
        }
    }
    async getPreferences(userId) {
        let preferences = await this.prisma.notificationPreference.findUnique({
            where: { userId },
        });
        if (!preferences) {
            preferences = await this.prisma.notificationPreference.create({
                data: { userId },
            });
        }
        return preferences;
    }
    async updatePreferences(userId, updateDto) {
        return this.prisma.notificationPreference.upsert({
            where: { userId },
            update: updateDto,
            create: {
                userId,
                ...updateDto,
            },
        });
    }
    async getHistory(userId, category, isRead, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = { userId };
        if (category) {
            where.category = category;
        }
        if (isRead !== undefined) {
            where.isRead = isRead;
        }
        const [logs, total] = await Promise.all([
            this.prisma.notificationLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.notificationLog.count({ where }),
        ]);
        return {
            logs,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async markAsRead(userId, logId) {
        const log = await this.prisma.notificationLog.findUnique({
            where: { id: logId },
        });
        if (!log) {
            throw new common_1.NotFoundException('Notification log not found.');
        }
        if (log.userId !== userId) {
            throw new common_1.BadRequestException('You do not own this notification.');
        }
        return this.prisma.notificationLog.update({
            where: { id: logId },
            data: { isRead: true },
        });
    }
    async markAllAsRead(userId) {
        await this.prisma.notificationLog.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return { success: true, message: 'All notifications marked as read.' };
    }
    async send(userId, category, title, body, metadata) {
        const prefs = await this.getPreferences(userId);
        let isCategoryEnabled = true;
        switch (category) {
            case client_1.NotificationCategory.driving_mode:
                isCategoryEnabled = prefs.drivingModeEnabled;
                break;
            case client_1.NotificationCategory.alert_delivery_confirmation:
                isCategoryEnabled = prefs.alertDeliveryEnabled;
                break;
            case client_1.NotificationCategory.false_alarm_log:
                isCategoryEnabled = prefs.falseAlarmLogEnabled;
                break;
            case client_1.NotificationCategory.system_status:
                isCategoryEnabled = prefs.systemStatusEnabled;
                break;
            case client_1.NotificationCategory.general:
                isCategoryEnabled = prefs.generalEnabled;
                break;
        }
        if (!isCategoryEnabled) {
            await this.prisma.notificationLog.create({
                data: {
                    userId,
                    category,
                    title,
                    body,
                    deliveryStatus: 'skipped_by_preference',
                    metadata: metadata || {},
                },
            });
            return { success: false, reason: 'skipped_by_preference' };
        }
        const devices = await this.prisma.deviceToken.findMany({
            where: { userId, isActive: true },
        });
        if (devices.length === 0) {
            await this.prisma.notificationLog.create({
                data: {
                    userId,
                    category,
                    title,
                    body,
                    deliveryStatus: 'failed',
                    metadata: { ...(metadata || {}), error: 'No active device tokens registered.' },
                },
            });
            return { success: false, reason: 'no_active_tokens' };
        }
        const registrationTokens = devices.map((d) => d.fcmToken);
        const formattedMetadata = {
            category,
        };
        if (metadata) {
            Object.keys(metadata).forEach((key) => {
                formattedMetadata[key] = String(metadata[key]);
            });
        }
        let deliveryStatus = 'sent';
        const failedTokens = [];
        try {
            if (this.isFirebaseInitialized) {
                const response = await admin.messaging().sendEachForMulticast({
                    tokens: registrationTokens,
                    notification: {
                        title,
                        body,
                    },
                    data: formattedMetadata,
                });
                response.responses.forEach((res, index) => {
                    if (!res.success && res.error) {
                        const code = res.error.code;
                        if (code === 'messaging/invalid-registration-token' ||
                            code === 'messaging/registration-token-not-registered') {
                            failedTokens.push(registrationTokens[index]);
                        }
                    }
                });
                if (failedTokens.length > 0) {
                    await this.prisma.deviceToken.updateMany({
                        where: {
                            userId,
                            fcmToken: { in: failedTokens },
                        },
                        data: {
                            isActive: false,
                        },
                    });
                }
            }
            else {
                console.log(`[Firebase Mock Logger] Dispatching push to user ${userId} (${devices.length} devices): "${title}" - "${body}"`);
            }
        }
        catch (err) {
            console.error('FCM dispatch failed:', err.message);
            deliveryStatus = 'failed';
        }
        return this.prisma.notificationLog.create({
            data: {
                userId,
                category,
                title,
                body,
                deliveryStatus,
                metadata: metadata || {},
            },
        });
    }
    async sendDrivingModeStatus(userId, isActive) {
        const title = isActive ? 'Driving Mode Paired' : 'Driving Mode Deactivated';
        const body = isActive
            ? 'ResQDrive is actively monitoring accident tracking sensors.'
            : 'Sensor monitoring has stopped.';
        return this.send(userId, client_1.NotificationCategory.driving_mode, title, body, {
            drivingModeActive: String(isActive),
            isSilentDataOnly: 'true',
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map