import { PrismaService } from '../prisma/prisma.service';
import { CreateDetectionLogDto } from './dto/create-detection-log.dto';
export declare class CrashSoundDetectionService {
    private prisma;
    constructor(prisma: PrismaService);
    logWindow(userId: string, dto: CreateDetectionLogDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        incidentId: string | null;
        windowTimestamp: Date;
        topMatchedClass: string | null;
        crashConfidence: number;
        thresholdUsed: number;
        flaggedAsCrash: boolean;
        combinedWithSensorSignal: boolean;
    }>;
    getHistory(userId: string, flaggedAsCrash?: boolean, page?: number, limit?: number): Promise<{
        logs: {
            id: string;
            createdAt: Date;
            userId: string;
            incidentId: string | null;
            windowTimestamp: Date;
            topMatchedClass: string | null;
            crashConfidence: number;
            thresholdUsed: number;
            flaggedAsCrash: boolean;
            combinedWithSensorSignal: boolean;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
