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
exports.AlertDispatchService = void 0;
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("./notifications.service");
const client_1 = require("@prisma/client");
let AlertDispatchService = class AlertDispatchService {
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
    }
    async dispatchIncidentAlert(userId, incidentId, severity) {
        console.log(`[AlertDispatchService] Processing incident ${incidentId} for user ${userId}...`);
        await this.notificationsService.send(userId, client_1.NotificationCategory.alert_delivery_confirmation, '🚨 Emergency Responder Dispatched', 'An accident alert was successfully verified. Emergency responders are heading to your location.', {
            incidentId,
            severity,
            dispatchStatus: 'dispatched',
        });
    }
};
exports.AlertDispatchService = AlertDispatchService;
exports.AlertDispatchService = AlertDispatchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], AlertDispatchService);
//# sourceMappingURL=alert-dispatch-example.service.js.map