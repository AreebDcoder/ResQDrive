import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EmergencyNotificationService } from './emergency-notification.service';

const TICK_INTERVAL_MS = 5 * 1000;

@Injectable()
export class EmergencyNotificationScheduler implements OnModuleInit {
  private readonly logger = new Logger(EmergencyNotificationScheduler.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private notificationService: EmergencyNotificationService) {}

  onModuleInit() {
    this.intervalId = setInterval(() => {
      this.tick().catch((err) => {
        this.logger.error(`Scheduler tick failed: ${err.message}`);
      });
    }, TICK_INTERVAL_MS);
    this.logger.log('Emergency notification scheduler started (5s interval)');
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async tick() {
    await this.notificationService.processEscalations();
  }
}