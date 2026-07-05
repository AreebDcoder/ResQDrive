import { CrashSoundDetectionService } from './crash-sound-detection.service';
import { CreateDetectionLogDto } from './dto/create-detection-log.dto';
export declare class CrashSoundDetectionController {
    private crashSoundService;
    constructor(crashSoundService: CrashSoundDetectionService);
    logWindow(user: {
        id: string;
    }, dto: CreateDetectionLogDto): Promise<{
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
    getHistory(user: {
        id: string;
    }, flaggedAsCrash?: string, page?: string, limit?: string): Promise<{
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
