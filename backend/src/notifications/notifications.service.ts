import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { NotificationCategory } from '@prisma/client';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private isFirebaseInitialized = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
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
      } else {
        console.warn(
          'Firebase credentials missing in environment variables. Running in console/DB fallback logging mode.'
        );
        this.isFirebaseInitialized = false;
      }
    } catch (error: any) {
      console.warn(
        'Failed to initialize Firebase Admin SDK. Fallback mock logger active. Error:',
        error.message
      );
      this.isFirebaseInitialized = false;
    }
  }

  // --- Device Tokens ---

  async registerDevice(userId: string, registerDto: RegisterDeviceDto) {
    const { fcmToken, platform } = registerDto;

    // Upsert the device token for this user
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

  async removeDeviceToken(userId: string, fcmToken: string) {
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
    } catch (error) {
      throw new NotFoundException('FCM device token not found for this user.');
    }
  }

  // --- Preferences ---

  async getPreferences(userId: string) {
    // If the preference row does not exist, auto-create it with defaults
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

  async updatePreferences(userId: string, updateDto: UpdatePreferencesDto) {
    // Upsert preferences just in case they were not created during register Hook
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: updateDto,
      create: {
        userId,
        ...updateDto,
      },
    });
  }

  // --- History Logs ---

  async getHistory(userId: string, category?: NotificationCategory, isRead?: boolean, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = { userId };
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

  async markAsRead(userId: string, logId: string) {
    const log = await this.prisma.notificationLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw new NotFoundException('Notification log not found.');
    }

    if (log.userId !== userId) {
      throw new BadRequestException('You do not own this notification.');
    }

    return this.prisma.notificationLog.update({
      where: { id: logId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notificationLog.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true, message: 'All notifications marked as read.' };
  }

  // --- Internal Messaging Service (called by other modules) ---

  /**
   * Dispatches a notification to all active devices of a user, taking category preferences into account.
   */
  async send(userId: string, category: NotificationCategory, title: string, body: string, metadata?: any) {
    // 1. Get preferences and verify if this category is enabled
    const prefs = await this.getPreferences(userId);
    let isCategoryEnabled = true;

    switch (category) {
      case NotificationCategory.driving_mode:
        isCategoryEnabled = prefs.drivingModeEnabled;
        break;
      case NotificationCategory.alert_delivery_confirmation:
        isCategoryEnabled = prefs.alertDeliveryEnabled;
        break;
      case NotificationCategory.false_alarm_log:
        isCategoryEnabled = prefs.falseAlarmLogEnabled;
        break;
      case NotificationCategory.system_status:
        isCategoryEnabled = prefs.systemStatusEnabled;
        break;
      case NotificationCategory.general:
        isCategoryEnabled = prefs.generalEnabled;
        break;
    }

    // 2. If preference is disabled, audit log it as skipped and return early
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

    // 3. Find active FCM tokens
    const devices = await this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
    });

    if (devices.length === 0) {
      // If user has no registered active devices, log send failure due to no tokens
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

    // Ensure metadata values are strings only (required by FCM data payload)
    const formattedMetadata: Record<string, string> = {
      category,
    };
    if (metadata) {
      Object.keys(metadata).forEach((key) => {
        formattedMetadata[key] = String(metadata[key]);
      });
    }

    let deliveryStatus = 'sent';
    const failedTokens: string[] = [];

    // 4. Send pushes
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

        // Loop through results and mark dead tokens (uninstalled app, invalid token) as inactive
        response.responses.forEach((res, index) => {
          if (!res.success && res.error) {
            const code = res.error.code;
            if (
              code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered'
            ) {
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
      } else {
        // Fallback Mock printing to logs
        console.log(
          `[Firebase Mock Logger] Dispatching push to user ${userId} (${devices.length} devices): "${title}" - "${body}"`
        );
      }
    } catch (err: any) {
      console.error('FCM dispatch failed:', err.message);
      deliveryStatus = 'failed';
    }

    // 5. Log the result
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

  /**
   * Toggles the driving mode status and sends a silent/data-only notification to the client
   * so it can toggle the persistent Expo Notification widget.
   */
  async sendDrivingModeStatus(userId: string, isActive: boolean) {
    const title = isActive ? 'Driving Mode Paired' : 'Driving Mode Deactivated';
    const body = isActive
      ? 'ResQDrive is actively monitoring accident tracking sensors.'
      : 'Sensor monitoring has stopped.';

    return this.send(userId, NotificationCategory.driving_mode, title, body, {
      drivingModeActive: String(isActive),
      isSilentDataOnly: 'true',
    });
  }
}
