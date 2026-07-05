export declare class CreateDetectionLogDto {
    incidentId?: string;
    windowTimestamp: string;
    topMatchedClass?: string;
    crashConfidence: number;
    thresholdUsed: number;
    flaggedAsCrash: boolean;
    combinedWithSensorSignal?: boolean;
}
