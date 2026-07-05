import { Injectable } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationCategory } from '@prisma/client';

@Injectable()
export class AlertDispatchService {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Mock service method demonstrating how other backend modules call
   * NotificationsService.send() to deliver push alerts to users.
   */
  async dispatchIncidentAlert(userId: string, incidentId: string, severity: string) {
    // 1. Process backend incident dispatch parameters...
    console.log(`[AlertDispatchService] Processing incident ${incidentId} for user ${userId}...`);

    // 2. Trigger push notification with category preference checks, token delivery, and history logging
    await this.notificationsService.send(
      userId,
      NotificationCategory.alert_delivery_confirmation,
      '🚨 Emergency Responder Dispatched',
      'An accident alert was successfully verified. Emergency responders are heading to your location.',
      {
        incidentId,
        severity,
        dispatchStatus: 'dispatched',
      }
    );
  }
}
