import { PrismaService } from '../prisma/prisma.service';
import { CreateVoiceLogDto } from './dto/create-voice-log.dto';
export declare class VoiceCommandsService {
    private prisma;
    constructor(prisma: PrismaService);
    logCommand(userId: string, dto: CreateVoiceLogDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        incidentId: string | null;
        rawTranscript: string;
        classifiedIntent: import(".prisma/client").$Enums.VoiceIntent;
        recognitionEngine: string;
        actionTaken: boolean;
    }>;
    getHistory(userId: string, page?: number, limit?: number): Promise<{
        logs: {
            id: string;
            createdAt: Date;
            userId: string;
            incidentId: string | null;
            rawTranscript: string;
            classifiedIntent: import(".prisma/client").$Enums.VoiceIntent;
            recognitionEngine: string;
            actionTaken: boolean;
        }[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
