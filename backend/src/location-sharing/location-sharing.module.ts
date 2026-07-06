import { Module } from '@nestjs/common';
import { LocationSharingController } from './location-sharing.controller';
import { LocationSharingService } from './location-sharing.service';
import { LocationSharingGateway } from './location-sharing.gateway';

@Module({
  controllers: [LocationSharingController],
  providers: [LocationSharingService, LocationSharingGateway],
  exports: [LocationSharingService, LocationSharingGateway],
})
export class LocationSharingModule {}