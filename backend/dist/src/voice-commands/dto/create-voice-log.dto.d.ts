import { VoiceIntent } from '@prisma/client';
export declare class CreateVoiceLogDto {
    incidentId?: string;
    rawTranscript: string;
    classifiedIntent: VoiceIntent;
    recognitionEngine: string;
    actionTaken: boolean;
}
