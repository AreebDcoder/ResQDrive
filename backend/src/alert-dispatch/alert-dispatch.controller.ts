import { Controller, Post, Body } from '@nestjs/common';
import { AlertDispatchService, AlertPayload } from './alert-dispatch.service';
import { DispatchAlertDto } from './dto/dispatch-alert.dto';

@Controller('alert-dispatch')
export class AlertDispatchController {
  constructor(private readonly service: AlertDispatchService) {}

  @Post()
  async dispatch(@Body() dto: DispatchAlertDto) {
    const payload: AlertPayload = {
      userId: dto.userId,
      incidentId: dto.incidentId,
      userName: dto.userName,
      vehicleInfo: dto.vehicleInfo,
      latitude: dto.latitude,
      longitude: dto.longitude,
      severity: dto.severity,
      contacts: dto.contacts,
    };
    return this.service.dispatchAlert(payload);
  }
}