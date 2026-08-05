import { Injectable, Logger } from '@nestjs/common';
import { EmergencySosService } from './emergency-sos.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmergencySosOrchestrator {
  private readonly logger = new Logger(EmergencySosOrchestrator.name);
  private activeTimers = new Map<string, NodeJS.Timeout>();
  
  // Callback registry for testing/custom action injection
  private onTriggerCallCallback: (incidentId: string, serviceName: string) => Promise<void> = async () => {};

  constructor(
    private prisma: PrismaService,
    private sosService: EmergencySosService,
  ) {}

  /**
   * Register a custom callback that fires when a timer expires.
   * Useful for unit tests to verify that the call was triggered.
   */
  setOnTriggerCall(callback: (incidentId: string, serviceName: string) => Promise<void>) {
    this.onTriggerCallCallback = callback;
  }

  /**
   * Starts a 60-second escalation timer for an incident.
   */
  startEscalationTimer(userId: string, incidentId: string, customDurationMs = 60000) {
    if (this.activeTimers.has(incidentId)) {
      this.logger.log(`Escalation timer already running for incident: ${incidentId}. Skipping duplicate.`);
      return;
    }

    this.logger.log(`Starting ${customDurationMs / 1000}s escalation timer for incident: ${incidentId}`);

    const timeout = setTimeout(async () => {
      this.activeTimers.delete(incidentId);
      await this.triggerAutoDialEscalation(userId, incidentId);
    }, customDurationMs);

    this.activeTimers.set(incidentId, timeout);
  }

  /**
   * Cancels the escalation timer for an incident.
   */
  cancelEscalationTimer(incidentId: string) {
    const timeout = this.activeTimers.get(incidentId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimers.delete(incidentId);
      this.logger.log(`Escalation timer cancelled for incident: ${incidentId}`);
    }
  }

  /**
   * Triggers the auto-dialing escalation process.
   */
  private async triggerAutoDialEscalation(userId: string, incidentId: string) {
    this.logger.log(`Escalation timer expired for incident: ${incidentId}. Triggering auto-dial...`);

    try {
      // Fetch incident details to get location coordinates
      const incident = await this.prisma.incident.findUnique({
        where: { id: incidentId },
      });

      const lat = incident?.latitude ?? 33.6844;
      const lng = incident?.longitude ?? 73.0479;

      // Fetch appropriate numbers for the location
      const numbersData = await this.sosService.getNumbersForLocation(lat, lng, userId);

      const topService = numbersData.regionalNumbers[0];
      const serviceName = topService ? topService.serviceName : 'Rescue 1122';

      // Log the auto-dialed call
      await this.sosService.logCall(userId, serviceName, true);

      // Trigger registered callbacks (for tests or integrations)
      await this.onTriggerCallCallback(incidentId, serviceName);

      this.logger.log(`Successfully escalated and logged auto-dial call to ${serviceName} for incident: ${incidentId}`);
    } catch (error: any) {
      this.logger.error(`Failed to execute auto-dial escalation: ${error.message}`);
    }
  }

  // Helper to check if a timer is active (useful in tests)
  hasActiveTimer(incidentId: string): boolean {
    return this.activeTimers.has(incidentId);
  }
}
