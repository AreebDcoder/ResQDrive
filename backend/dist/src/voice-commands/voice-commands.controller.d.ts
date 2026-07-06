import { VoiceCommandsService } from './voice-commands.service';
import { CreateVoiceLogDto } from './dto/create-voice-log.dto';
export declare class VoiceCommandsController {
    private voiceCommandsService;
    constructor(voiceCommandsService: VoiceCommandsService);
    logCommand(user: {
        id: string;
    }, dto: CreateVoiceLogDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        incidentId: string | null;
        rawTranscript: string;
        classifiedIntent: import(".prisma/client").$Enums.VoiceIntent;
        recognitionEngine: string;
        actionTaken: boolean;
    }>;
    getHistory(user: {
        id: string;
    }, page?: string, limit?: string): Promise<{
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
