import { NotificationsService } from './notifications.service';
export declare class AlertDispatchService {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    dispatchIncidentAlert(userId: string, incidentId: string, severity: string): Promise<void>;
}
