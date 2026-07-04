import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsSummaryDto {
  @ApiProperty()
  totalIncidents: number;

  @ApiProperty()
  activeIncidents: number;

  @ApiProperty()
  resolvedIncidents: number;

  @ApiProperty()
  falseAlarms: number;

  @ApiProperty({ type: 'object' })
  severityBreakdown: {
    NONE: number;
    MINOR: number;
    MODERATE: number;
    SEVERE: number;
  };

  @ApiProperty({ type: 'object' })
  severityPercentages: {
    NONE: number;
    MINOR: number;
    MODERATE: number;
    SEVERE: number;
  };

  @ApiProperty({ type: 'array' })
  recentIncidents: Array<{
    id: string;
    occurredAt: Date;
    severity: string;
    status: string;
    address?: string | null;
  }>;
}

export class AnalyticsTrendDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  count: number;
}

export class AnalyticsHotspotDto {
  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty()
  incidentCount: number;

  @ApiProperty({ type: 'array' })
  sampleAddresses: string[];
}